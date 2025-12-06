import type { Element } from 'hast';

import { mdast, mdx, mdxish } from '../../index';

describe('gemoji compiler', () => {
  it('should compile back to a shortcode', () => {
    const markdown = 'This is a gemoji :joy:.';

    expect(mdx(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });

  it('should compile owlmoji back to a shortcode', () => {
    const markdown = ':owlbert:';

    expect(mdx(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });

  it('should compile font-awsome emojis back to a shortcode', () => {
    const markdown = ':fa-readme:';

    expect(mdx(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });
});

describe('mdxish gemoji compiler', () => {
  it('should convert gemojis to emoji nodes', () => {
    const markdown = 'This is a gemoji :joy:.';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');

    // Gemoji should be converted to an emoji node or image
    const hasEmoji = paragraph.children.some(
      child => child.type === 'element' && (child.tagName === 'img' || child.tagName === 'i'),
    );
    expect(
      hasEmoji ||
        paragraph.children.some(child => child.type === 'text' && 'value' in child && child.value?.includes('😂')),
    ).toBeTruthy();
  });

  it('should convert owlmoji to image nodes', () => {
    const markdown = ':owlbert:';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const image = paragraph.children.find(child => child.type === 'element' && child.tagName === 'img') as Element;
    expect(image).toBeDefined();
    expect(image.properties.alt).toBe(':owlbert:');
  });

  it('should convert font-awesome emojis to icon elements', () => {
    const markdown = ':fa-readme:';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const icon = paragraph.children.find(child => child.type === 'element' && child.tagName === 'i') as Element;
    expect(icon).toBeDefined();
    expect(Array.isArray(icon.properties.className) ? icon.properties.className : []).toContain('fa-readme');
  });
});
