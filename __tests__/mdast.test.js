import { mdast } from '../index';

describe('mdast(text, opts)', () => {
  it('should parse mdx', () => {
    const mdx = '<Test>content</Test>';
    const tree = mdast(mdx, { mdx: true });

    expect(tree.children[0].type).toBe('jsx');
  });

  it('should parse html as mdx', () => {
    const mdx = `
<h1>Heading</h1>
`;
    const tree = mdast(mdx, { mdx: true });

    expect(tree.children[0].type).toBe('jsx');
  });

  it('should parse a magic block', () => {
    const mdx = `
[block:parameters]
{
  "data": {
    "h-0": "new  \\nline",
    "h-1": "",
    "h-2": "",
    "0-0": "",
    "0-1": "",
    "0-2": "",
    "1-0": "",
    "1-1": "",
    "1-2": ""
  },
  "cols": 3,
  "rows": 2,
  "align": [
    "left",
    "left",
    "left"
  ]
}
[/block]
    `;
    const tree = mdast(mdx, { mdx: true });

    expect(tree.children[0].type).toBe('table');
  });

  it('should parse mdx at the end of the line', () => {
    const mdx = '# Heading <span>content</span>';
    const tree = mdast(mdx, { mdx: true });

    expect(tree.children[0].type).toBe('heading');
    expect(tree.children[0].children[1].type).toBe('jsx');
  });
});
