import * as rmdx from '@readme/mdx';

import { compatParser as mdast } from '@readme/backend/models/project/lib/migrateMdx/compatParser';

describe('migrating images', () => {
  it('compiles images', () => {
    const md = `
[block:image]
{
  "images": [
    {
      "image": [
        "https://fastly.picsum.photos/id/507/200/300.jpg?hmac=v0NKvUrOWTKZuZFmMlLN_7-RdRgeF-qFLeBGXpufxgg",
        "",
        ""
      ],
      "align": "center",
      "border": true
    }
  ]
}
[/block]
`;

    const ast = mdast(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
      "<Image align="center" border={true} src="https://fastly.picsum.photos/id/507/200/300.jpg?hmac=v0NKvUrOWTKZuZFmMlLN_7-RdRgeF-qFLeBGXpufxgg" />
      "
    `);
  });
});
