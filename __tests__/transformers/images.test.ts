import type { Element, Nodes as HastNode, Root as HastRoot } from 'hast';

import { mdast } from '../../index';
import { mdxish } from '../../lib/mdxish';
import { findElementByTagName } from '../helpers';

describe('images transformer', () => {
  it('converts single children images of paragraphs to an image-block', () => {
    const md = `
![alt](https://example.com/image.jpg)
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('image-block');
    expect(tree.children[0].src).toBe('https://example.com/image.jpg');
  });

  it('can parse the caption markdown to children', () => {
    const md = `
<Image src="https://example.com/image.jpg" caption="**this** is *markdown*" />
`;
    const tree = mdast(md);

    expect(tree.children[0].children[0].children[0].type).toBe('strong');
    expect(tree.children[0].children[0].children[2].type).toBe('emphasis');
  });

  it('parses an Image inside a caption attribute via mdxish (RM-16428)', () => {
    const md = `
<Image align="center" caption="<Image align=&#x22;center&#x22; caption=&#x22;Light & Dark&#x22; src=&#x22;https://example.com/a.png&#x22; />" src="https://example.com/b.png" width="700px" />
`;
    expect(() => mdxish(md)).not.toThrow();

    const hast = mdxish(md);
    const imgs: Element[] = [];
    const walk = (n: HastNode | HastRoot) => {
      if ('tagName' in n && n.tagName === 'img') imgs.push(n);
      if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
    };
    walk(hast);
    expect(imgs.length).toBeGreaterThanOrEqual(2);

    const srcs = imgs.map(i => i.properties?.src ?? '');
    expect(srcs).toStrictEqual(expect.arrayContaining([
      'https://example.com/b.png',
      'https://example.com/a.png',
    ]));
  });

  it('can parse attributes', () => {
    const md = `
<Image
  align="left"
  alt="Some helpful text"
  border
  src="https://example.com/image.jpg"
  title="Testing"
  width="100px"
/>
`;
    const tree = mdast(md);

    expect(tree.children[0].align).toBe('left');
    expect(tree.children[0].alt).toBe('Some helpful text');
    expect(tree.children[0].border).toBe(true);
    expect(tree.children[0].title).toBe('Testing');
    expect(tree.children[0].width).toBe('100px');
  });

  describe('in mdxish', () => {
    describe('inside MDX components (mdxish pipeline)', () => {
      it('renders a markdown image inside <Tabs><Tab> as <img> with src and alt', () => {
        const tree = mdxish('<Tabs>\n<Tab title="x">\n\n![my alt](https://example.com/img.png)\n\n</Tab>\n</Tabs>');

        const img = findElementByTagName(tree, 'img');
        expect(img).toMatchObject({
          type: 'element',
          tagName: 'img',
          properties: {
            src: 'https://example.com/img.png',
            alt: 'my alt',
          },
          children: [],
        });
      });

      it('renders a markdown image inside <Callout> as <img>', () => {
        const tree = mdxish('<Callout icon="📘">\n\n![alt](https://example.com/img.png)\n\n</Callout>');

        const img = findElementByTagName(tree, 'img');
        expect(img).toMatchObject({
          type: 'element',
          tagName: 'img',
          properties: { src: 'https://example.com/img.png', alt: 'alt' },
        });
      });

      it('renders an image nested inside a list item inside <Tabs>', () => {
        const tree = mdxish(
          '<Tabs>\n<Tab title="x">\n\n1. Step\n\n   ![alt](https://example.com/img.png)\n\n</Tab>\n</Tabs>',
        );

        const img = findElementByTagName(tree, 'img');
        expect(img).toMatchObject({
          properties: { src: 'https://example.com/img.png', alt: 'alt' },
        });
      });
    });
  });
});
