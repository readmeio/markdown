import { mdast } from '../index';

describe('normalize option', () => {
  it('normalizes magic block newlines', () => {
    const doc = `
> blockquote
>
[block:image]
{
  "images": [
    {
      "image": [
        "https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]
`;
    const tree = mdast(doc);

    expect(tree.children[1].type).toBe('image');
  });

  it('does not normalize nested magic blocks', () => {
    const doc = `
> blockquote
>
> [block:image]{ "images": [ { "image": [ "https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]
`;
    const tree = mdast(doc, { normalize: false });

    expect(tree.children[0].children[1].type).toBe('image');
  });
});
