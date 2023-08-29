import { mdast } from '../../index';

describe('Parse Magic Blocks', () => {
  it('parses an magic block in a container node', () => {
    const text = `
> ℹ️ Info Callout
>
> [block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]
`;
    const tree = mdast(text);

    expect(tree.children[0].type).toBe('rdme-callout');
    expect(tree.children[0].children[1].type).toBe('image');
  });

  it('magic block on a single line', () => {
    const md = '[block:api-header]{"type": "basic"}[/block]';
    const tree = mdast(md);
    expect(tree.children[0].type).toBe('heading');
  });

  it('magic block with leading whitespace on one line', () => {
    const md = '    [block:api-header]{"type": "basic"}[/block]';
    const tree = mdast(md);
    expect(tree.children[0].type).toBe('heading');
  });

  it('magic block with leading whitespace on multiple lines', () => {
    const md = `
      [block:api-header]
      {
        "type": "basic"
      }
      [/block]
    `;
    const tree = mdast(md);
    expect(tree.children[0].type).toBe('heading');
  });
});
