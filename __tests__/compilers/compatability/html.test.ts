import { mdx } from '../../../index';
import * as rdmd from '@readme/markdown-legacy';

describe('compiling html tags to MDX', () => {
  it('closes self closing tags', () => {
    const md = `<br>`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "<br />
      "
    `);
  });

  it('closes self closing tags in an html block', () => {
    const md = `
<div>
  <br>
</div>
`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "<div>
        <br />
      </div>
      "
    `);
  });

  it('closes unclosed tags', () => {
    const md = `
<div>
  <div>
</div>
`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "<div>
        <div>
      </div></div>
      "
    `);
  });

  it('closes unclosed tags with content', () => {
    const md = `
<div>
  <div>Hi there
</div>
`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "<div>
        <div>Hi there
      </div></div>
      "
    `);
  });

  it('closes unclosed phrasing tags in an html block', () => {
    const md = `
<div>
  <span>Hi there
</div>
`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "<div>
        <span>Hi there
      </span></div>
      "
    `);
  });

  it('escapes lone custom tags', () => {
    const md = `<hi-there>`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "\\<hi-there>
      "
    `);
  });

  it('escapes back to back custom tags', () => {
    const md = `<hi-there> <friend>`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "\\<hi-there> \\<friend>
      "
    `);
  });

  it('does not escape custom tags in html blocks', () => {
    const md = `<div><hi-there></div>`;

    expect(mdx(rdmd.mdast(md))).toMatchInlineSnapshot(`
      "<div><hi-there /></div>
      "
    `);
  });
});
