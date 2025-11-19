import { mdast, mdx, mix } from '../index';

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

describe('mix ReadMe Flavored Blocks', () => {
  it.skip('Embed', () => {
    const txt = '[Embedded meta links.](https://nyti.me/s/gzoa2xb2v3 "@embed")';
    const ast = mdast(txt);
    const out = mix(ast);
    expect(out).toMatchSnapshot();
  });

  it.skip('Emojis', () => {
    expect(mix(mdast(':smiley:'))).toMatchInlineSnapshot(`
      ":smiley:
      "
    `);
  });
});
