import type { Element } from 'hast';

import { mdast, mdx, mdxish } from '../index';

describe('ReadMe Flavored Blocks', () => {
  it('Embed', () => {
    const txt = '[Embedded meta links.](https://nyti.me/s/gzoa2xb2v3 "@embed")';
    const ast = mdast(txt);
    const out = mdx(ast);
    expect(out).toMatchSnapshot();
  });

  it('Emojis', () => {
    expect(mdx(mdast(':smiley:'))).toMatchInlineSnapshot(`
      ":smiley:
      "
    `);
  });
});

describe('mdxish ReadMe Flavored Blocks', () => {
  it('Embed', () => {
    const txt = '[Embedded meta links.](https://nyti.me/s/gzoa2xb2v3 "@embed")';
    const hast = mdxish(txt);
    const embed = hast.children[0] as Element;

    expect(embed.type).toBe('element');
    expect(embed.tagName).toBe('embed');
    expect(embed.properties.url).toBe('https://nyti.me/s/gzoa2xb2v3');
    expect(embed.properties.title).toBe('Embedded meta links.');
  });

  it('Emojis', () => {
    const hast = mdxish(':smiley:');
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    // gemojiTransformer converts :smiley: to 😃
    const textNode = paragraph.children[0];
    expect(textNode.type).toBe('text');
    expect('value' in textNode && textNode.value).toBe('😃');
  });
});
