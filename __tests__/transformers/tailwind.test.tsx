import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../helpers';

/**
 * The tailwind transformer wraps custom components in a `<TailwindRoot>` whose
 * `flow` prop drives a `div` (block) vs `span` (inline) render. A component
 * sitting inside an inline-only parent (e.g. an `<Image>` mid-paragraph) must
 * stay inline; a block `div` there is split out of its `<p>` by the browser and
 * drops onto its own line (RM-18331). These cover the flow/inline decision at
 * both the HAST and the rendered-HTML level, and lock in the MDX parity that
 * regressed when customers moved from MDX to MDXish.
 */

const IMAGE = '<Image alt="menu icon" width="15px" src="https://files.readme.io/a.png" />';

const toHast = (md: string) => mdxish(md, { useTailwind: true, components: { Foo: '<span>hi</span>' } });

const toHtml = (md: string) => {
  const mod = renderMdxish(toHast(md));
  const { container } = render(React.createElement(mod.default as React.FC));
  return container.innerHTML;
};

const topLevelWrappers = (md: string) => toHast(md).children.filter(c => 'tagName' in c && c.tagName === 'TailwindRoot');

describe('tailwind transformer', () => {
  describe('flow/inline wrapping', () => {
    describe('inline context → span wrapper', () => {
      it('keeps an Image inline when flanked by text on one line', () => {
        const hast = toHast(`line 1 ${IMAGE} line 2`);
  
        expect(hast.children).toMatchObject([
          {
            tagName: 'p',
            children: [
              { type: 'text', value: 'line 1 ' },
              { tagName: 'TailwindRoot', children: [{ tagName: 'img' }] },
              { type: 'text', value: ' line 2' },
            ],
          },
        ]);
        // `flow` is dropped (false)
        expect(findElementByTagName(hast, 'TailwindRoot')?.properties).toStrictEqual({});
        expect(topLevelWrappers(`line 1 ${IMAGE} line 2`)).toHaveLength(0);
      });
  
      it('keeps an Image inline with a soft break after it', () => {
        const md = `line 1 ${IMAGE}\nline 2`;
        const hast = toHast(md);
  
        // Not a block wrapper, and the span wrapper lives inside the paragraph.
        expect(topLevelWrappers(md)).toHaveLength(0);
        const paragraph = hast.children[0];
        expect(paragraph).toMatchObject({ tagName: 'p' });
        expect(findElementByTagName(paragraph, 'TailwindRoot')).toMatchObject({
          properties: {},
          children: [{ tagName: 'img' }],
        });
      });
  
      it('generalizes to any self-closing custom component, not just Image', () => {
        const hast = toHast('line 1 <Foo /> line 2');
  
        expect(hast.children).toMatchObject([
          {
            tagName: 'p',
            children: [
              { type: 'text', value: 'line 1 ' },
              { tagName: 'TailwindRoot', properties: {}, children: [{ tagName: 'Foo' }] },
              { type: 'text', value: ' line 2' },
            ],
          },
        ]);
      });

      it('keeps an Image inline when the text is wrapped in a single-line HTML tag', () => {
        // A single-line `<div>` keeps its inline content as direct children (no
        // `<p>`), so the parent type alone can't tell this apart from a block.
        const md = `<div>line 1 ${IMAGE} line 2</div>`;
        const hast = toHast(md);

        expect(hast.children).toMatchObject([
          {
            tagName: 'div',
            children: [
              { type: 'text', value: 'line 1 ' },
              { tagName: 'TailwindRoot', properties: {}, children: [{ tagName: 'img' }] },
              { type: 'text', value: ' line 2' },
            ],
          },
        ]);
        expect(topLevelWrappers(md)).toHaveLength(0);
      });

      it('keeps an Image inline next to text in a list item', () => {
        const hast = toHast(`- item ${IMAGE}`);

        expect(findElementByTagName(hast, 'li')).toMatchObject({
          children: [
            { type: 'text', value: 'item ' },
            { tagName: 'TailwindRoot', properties: {}, children: [{ tagName: 'img' }] },
          ],
        });
      });
    });
  
    describe('block context → div wrapper (unchanged behavior)', () => {
      it('wraps an Image on its own line between text as a block', () => {
        const md = `Line 1\n${IMAGE}\nLine 2`;
        const hast = toHast(md);
  
        expect(topLevelWrappers(md)).toMatchObject([{ tagName: 'TailwindRoot', properties: { flow: true }, children: [{ tagName: 'img' }] }]);
        // Flanking text stays in its own paragraphs, so nothing is inline here.
        expect(hast.children[0]).toMatchObject({ tagName: 'p', children: [{ type: 'text', value: 'Line 1' }] });
      });
  
      it('wraps a blank-line separated Image as a block', () => {
        const md = `Line 1\n\n${IMAGE}\n\nLine 2`;
        expect(topLevelWrappers(md)).toMatchObject([{ tagName: 'TailwindRoot', properties: { flow: true }, children: [{ tagName: 'img' }] }]);
      });
  
      it('wraps a block-level custom component as a block', () => {
        const md = 'Line 1\n\n<Foo>hi</Foo>\n\nLine 2';
        expect(topLevelWrappers(md)).toMatchObject([{ tagName: 'TailwindRoot', properties: { flow: true }, children: [{ tagName: 'Foo' }] }]);
      });

      it.each([
        ['on one line', `<div>${IMAGE}</div>`],
        ['with whitespace-only siblings', `<div>\n${IMAGE}\n</div>`],
      ])('wraps a lone Image inside an HTML tag as a block %s', (_, md) => {
        expect(findElementByTagName(toHast(md), 'div')).toMatchObject({
          children: [{ tagName: 'TailwindRoot', properties: { flow: true }, children: [{ tagName: 'img' }] }],
        });
      });

      it('wraps a lone Image in a list item as a block', () => {
        const wrapper = findElementByTagName(toHast(`- ${IMAGE}`), 'TailwindRoot');
        expect(wrapper).toMatchObject({ properties: { flow: true }, children: [{ tagName: 'img' }] });
      });
    });
  
    describe('plain HTML tags are never wrapped', () => {
      it('leaves an inline lowercase <image> unwrapped and inline', () => {
        const hast = toHast('line 1 <image />\nline 2');
  
        expect(findAllElementsByTagName(hast, 'TailwindRoot')).toHaveLength(0);
        const paragraph = findElementByTagName(hast, 'p');
        expect(paragraph?.children[0]).toMatchObject({ type: 'text', value: 'line 1 ' });
        expect(findElementByTagName(hast, 'img')).not.toBeNull();
      });
  
      it('leaves an inline <span> unwrapped and inline', () => {
        const hast = toHast('line 1 <span>hi</span> line 2');
  
        expect(findAllElementsByTagName(hast, 'TailwindRoot')).toHaveLength(0);
        expect(hast.children).toMatchObject([
          {
            tagName: 'p',
            children: [
              { type: 'text', value: 'line 1 ' },
              { tagName: 'span', children: [{ type: 'text', value: 'hi' }] },
              { type: 'text', value: ' line 2' },
            ],
          },
        ]);
      });
    });
  
    describe('rendered HTML', () => {
      it('renders an inline Image as a span inside the paragraph', () => {
        expect(toHtml(`line 1 ${IMAGE} line 2`)).toContain('<p>line 1 <span class="readme-tailwind">');
      });
  
      it('renders an Image inside a single-line HTML tag as an inline span', () => {
        expect(toHtml(`<div>line 1 ${IMAGE} line 2</div>`)).toContain('<div>line 1 <span class="readme-tailwind">');
      });

      it('renders an own-line Image as a block div outside the paragraph', () => {
        const html = toHtml(`Line 1\n${IMAGE}\nLine 2`);
        expect(html).toMatch(/<p>Line 1<\/p>/);
        expect(html).toContain('<div class="readme-tailwind">');
      });
    });
  });
});


