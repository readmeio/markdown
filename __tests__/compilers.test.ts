import { mdast, mdx } from '../index';

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
