import * as rmdx from '@readme/mdx';

import { compatParser as mdast } from '@readme/backend/models/project/lib/migrateMdx/compatParser';

describe('mdx migration of link references', () => {
  it('compiles link references correctly', () => {
    const md = '[wat_wat]';

    const ast = mdast(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
      "\\[wat\\_wat]
      "
    `);
  });

  it('compiles link references with defintions correctly', () => {
    const md = `
[wat_wat]

[wat_wat]: https://wat.com
`;

    const ast = mdast(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
      "[wat\\_wat][wat_wat]

      [wat_wat]: https://wat.com
      "
    `);
  });
});
