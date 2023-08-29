import { mdast } from '../../index';

describe('Parse Magic Blocks', () => {
  it('parses an magic block in a container node', () => {
    const text = `
> ℹ️ Info Callout
>
> [block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]
`;
    const tree = mdast(text);

    console.log(JSON.stringify({ tree }, null, 2));

    expect(tree.children[0].type).toBe('rdme-callout');
  });
});
