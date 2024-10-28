import * as rmdx from '../../index';

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

    const ast = rmdx.mdastV6(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
      "<Image align="center" border={true} src="https://fastly.picsum.photos/id/507/200/300.jpg?hmac=v0NKvUrOWTKZuZFmMlLN_7-RdRgeF-qFLeBGXpufxgg" />
      "
    `);
  });
});
