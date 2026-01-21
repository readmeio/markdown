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

  it('does not create nested links when Anchor label looks like a URL', () => {
    const markdown = '<Anchor target="_blank" href="https://example.com">https://example.com</Anchor>';

    // GFM autolinks URL-like text, but we unwrap it and the serializer escapes
    // the colon to prevent re-autolinking on next parse
    expect(mdx(mdast(markdown)).trim()).toBe(
      '<Anchor target="_blank" href="https://example.com">https\\://example.com</Anchor>',
    );
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
