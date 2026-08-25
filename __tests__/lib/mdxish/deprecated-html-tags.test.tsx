import type { CustomComponents } from '../../../types';

import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';
import React from 'react';

import { compile, mdxish, renderMdxish, run } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

// Samples of deprecated-but-still-rendered tags (`<center>`, `<font>`, `<big>`, …).
// Mainly using center as an example because it's a commonly used deprecated tag.
const SAMPLE_LEGACY_TAGS = [
  'acronym',
  'applet',
  'basefont',
  'big',
  'center',
  'dir',
  'font',
  'listing',
  'marquee',
  'noembed',
  'rtc',
  'strike',
  'xmp',
];
const renderToDom = (md: string, components: CustomComponents = {}) => {
  const Content = renderMdxish(mdxish(md, { components }), { components }).default;
  return render(<Content />);
};

const bannerComponent = run(
  compile(`export const Banner = ({ children }) => <section className="banner">{children}</section>;

<Banner />`),
);

describe('deprecated html tags', () => {
  describe('inside ReadMe components', () => {
    // The reported doc: every card rendered blank because its only child was a <center>.
    it('renders a <center> inside each <Card> of a <Cards> grid', () => {
      const { container } = renderToDom(`<Cards columns={3} align="center">
<Card title="">
<center>**Centralized Model Management and Visibility**</center>
</Card>

<Card title="">
<center>**Precise Control Over Model Access**</center>
</Card>
</Cards>`);

      const cards = container.querySelectorAll('.Card-content');
      expect(cards).toHaveLength(2);
      expect(Array.from(cards).map(card => card.innerHTML)).toStrictEqual([
        '<center><strong>Centralized Model Management and Visibility</strong></center>',
        '<center><strong>Precise Control Over Model Access</strong></center>',
      ]);
    });

    it('renders a <center> inside a magic-block callout', () => {
      const { container } = renderToDom('> 📘 Note\n>\n> <center>**centered**</center>');

      const callout = container.querySelector('.callout');
      expect(
        within(callout as HTMLElement)
          .getByText('centered')
          .closest('center'),
      ).toBeInTheDocument();
    });

    it('renders a <center> inside a JSX <Callout> body', () => {
      const { container } = renderToDom(`<Callout icon="👍" theme="okay">
  ## Nice

  <center>**centered**</center>
</Callout>`);

      expect(container.querySelector('.callout center')).toHaveTextContent('centered');
    });

    it('renders deprecated tags inside markdown table cells', () => {
      const { container } = renderToDom(`| Tag | Example |
| --- | --- |
| center | <center>**middle**</center> |
| font | <font color="red">red</font> |`);

      const cells = container.querySelectorAll('td');
      expect(cells[1].innerHTML).toBe('<center><strong>middle</strong></center>');
      expect(cells[3].innerHTML).toBe('<font color="red">red</font>');
    });

    it('renders a <center> inside an <HTMLBlock> payload', () => {
      const { container } = renderToDom('<HTMLBlock>{`<center><b>raw html</b></center>`}</HTMLBlock>');

      expect(container.querySelector('.rdmd-html')?.innerHTML).toBe('<center><b>raw html</b></center>');
    });
  });

  describe('inside custom components', () => {
    it('renders a <center> inside a custom component body', () => {
      const { container } = renderToDom('<Banner>\n<center>**inside custom**</center>\n</Banner>', {
        Banner: bannerComponent,
      });

      expect(container.querySelector('.banner')?.innerHTML).toBe('<center><strong>inside custom</strong></center>');
    });

    // Recognizing `center` as HTML must not steal a registered component of the same
    // name: both spellings still resolve to it, as they did before.
    it('lets a registered <Center> component keep precedence over the html tag', () => {
      const centerComponent = run(
        compile(`export const Center = ({ children }) => <div className="my-center">{children}</div>;

<Center />`),
      );
      const { container } = renderToDom('<Center>hello</Center>\n\n<center>plain</center>', {
        Center: centerComponent,
      });

      expect(Array.from(container.querySelectorAll('.my-center')).map(node => node.textContent)).toStrictEqual([
        'hello',
        'plain',
      ]);
      expect(container.querySelector('center')).toBeNull();
    });
  });

  describe('inside html trees', () => {
    it.each(SAMPLE_LEGACY_TAGS)('keeps a <%s> instead of dropping it as an unknown component', tag => {
      const tree = mdxish(`<div class="wrap"><${tag} title="t">kept</${tag}></div>`);

      expect(findElementByTagName(tree, tag)).not.toBeNull();
    });

    // `param` is declared in HTML_VOID_ELEMENTS and repaired by closeSelfClosingHtmlTags,
    // so dropping it as an unknown component contradicted the same module. (CX-3699)
    it('keeps a void <param> inside an <object>', () => {
      const tree = mdxish('<object data="movie.swf"><param name="quality" value="high" /></object>');

      expect(findElementByTagName(tree, 'param')).toMatchObject({
        tagName: 'param',
        properties: { name: 'quality', value: 'high' },
      });
    });

    it('keeps a <center> nested in plain HTML wrappers', () => {
      const tree = mdxish('<div class="outer">\n  <section>\n    <center>**deep**</center>\n  </section>\n</div>');

      expect(findElementByTagName(tree, 'center')).toMatchObject({
        type: 'element',
        tagName: 'center',
        children: [{ type: 'element', tagName: 'strong', children: [{ type: 'text', value: 'deep' }] }],
      });
    });

    it('keeps deprecated tags nested inside each other', () => {
      const tree = mdxish('<center><font color="blue"><big>**stacked**</big></font></center>');

      expect(findElementByTagName(tree, 'center')).toMatchObject({
        tagName: 'center',
        children: [
          {
            tagName: 'font',
            properties: { color: 'blue' },
            children: [{ tagName: 'big', children: [{ tagName: 'strong' }] }],
          },
        ],
      });
    });

    it('keeps a <center> inside a list item and a blockquote', () => {
      const listTree = mdxish('- <center>**item**</center>');
      const quoteTree = mdxish('> <center>**quote**</center>');

      expect(findElementByTagName(listTree, 'li')?.children).toContainEqual(
        expect.objectContaining({ tagName: 'center' }),
      );
      expect(findElementByTagName(quoteTree, 'blockquote')?.children).toContainEqual(
        expect.objectContaining({ tagName: 'center' }),
      );
    });

    it('keeps a <center> that wraps a link and an image', () => {
      const tree = mdxish('<center>[![logo](https://example.com/logo.png)](https://example.com)</center>');
      const center = findElementByTagName(tree, 'center');

      expect(findElementByTagName(center!, 'a')).toMatchObject({ properties: { href: 'https://example.com' } });
      expect(findElementByTagName(center!, 'img')).toMatchObject({
        properties: { src: 'https://example.com/logo.png' },
      });
    });

    it('leaves deprecated tags inside code untouched', () => {
      const tree = mdxish('```html\n<center>code</center>\n```\n\n`<tt>inline</tt>`');

      expect(findAllElementsByTagName(tree, 'center')).toHaveLength(0);
      expect(findAllElementsByTagName(tree, 'tt')).toHaveLength(0);
    });
  });

  describe('formatting variations', () => {
    it.each([
      ['condensed', '<center>**hi**</center>'],
      ['padded by blank lines', '<center>\n\n**hi**\n\n</center>'],
      ['split across lines', '<center>\n**hi**\n</center>'],
      ['indented', '  <center>**hi**</center>'],
      ['with whitespace in the closing tag', '<center>**hi**</ center >'],
    ])('renders a centered bold string when %s', (_label, md) => {
      const center = findElementByTagName(mdxish(md), 'center');

      expect(center).not.toBeNull();
      expect(findElementByTagName(center!, 'strong')).toMatchObject({ children: [{ type: 'text', value: 'hi' }] });
    });
  });

  describe('engine parity', () => {
    const renderThroughMdx = (md: string) => {
      const Content = run(compile(md)).default;
      return render(<Content />);
    };

    it.each([
      ['a block-level <center>', '<center>hello **world**</center>'],
      ['inline deprecated tags', 'a <big>big</big>, <strike>gone</strike>, <tt>mono</tt>'],
      ['a <font> with attributes', 'text <font color="red">**red**</font> tail'],
    ])('matches the mdx engine for %s', (_label, md) => {
      expect(renderToDom(md).container.innerHTML).toBe(renderThroughMdx(md).container.innerHTML);
    });
  });
});
