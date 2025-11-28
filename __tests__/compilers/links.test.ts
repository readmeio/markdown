import type { Element } from 'hast';

import { mdast, mdx, mdxish } from '../../index';

describe('link compiler', () => {
  it('compiles links without extra attributes', () => {
    const markdown = '<Anchor href="https://readme.com">ReadMe</Anchor>';

    expect(mdx(mdast(markdown)).trim()).toBe('[ReadMe](https://readme.com)');
  });

  it('compiles links with extra attributes', () => {
    const markdown = '<Anchor target="_blank" href="https://readme.com">ReadMe</Anchor>';

    expect(mdx(mdast(markdown)).trim()).toBe(markdown);
  });
});

describe('mdxish link compiler', () => {
  it('compiles links without extra attributes', () => {
    const markdown = '<Anchor href="https://readme.com">ReadMe</Anchor>';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;
    const anchor = paragraph.children[0] as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    expect(anchor.type).toBe('element');
    expect(anchor.tagName).toBe('Anchor');
    expect(anchor.properties.href).toBe('https://readme.com');
    const textNode = anchor.children[0];
    expect(textNode.type).toBe('text');
    expect('value' in textNode && textNode.value).toBe('ReadMe');
  });

  it('compiles links with extra attributes', () => {
    const markdown = '<Anchor target="_blank" href="https://readme.com">ReadMe</Anchor>';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;
    const anchor = paragraph.children[0] as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    expect(anchor.type).toBe('element');
    expect(anchor.tagName).toBe('Anchor');
    expect(anchor.properties.href).toBe('https://readme.com');
    expect(anchor.properties.target).toBe('_blank');
    const textNode = anchor.children[0];
    expect(textNode.type).toBe('text');
    expect('value' in textNode && textNode.value).toBe('ReadMe');
  });
});
