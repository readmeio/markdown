import { migrate } from '../helpers';

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
        "now with alt text!"
      ],
      "align": "center",
      "border": true
    }
  ]
}
[/block]
`;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "<Image alt="now with alt text!" align="center" className="border" border={true} src="https://fastly.picsum.photos/id/507/200/300.jpg?hmac=v0NKvUrOWTKZuZFmMlLN_7-RdRgeF-qFLeBGXpufxgg" />
      "
    `);
  });
});
