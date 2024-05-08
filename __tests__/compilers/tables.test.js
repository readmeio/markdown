import { mdast, mdx } from '../../index';
import { visit, EXIT } from 'unist-util-visit';

describe('table compiler', () => {
  it('writes to markdown syntax', () => {
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;

    expect(mdx(mdast(markdown))).toBe(
      `|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`,
    );
  });

  it.only('saves to MDX if there are breaks', () => {
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;

    const tree = mdast(markdown);

    console.log(JSON.stringify({ tree }, null, 2));
    visit(tree, 'tableCell', cell => {
      cell.children.push({ type: 'break' }, { type: 'text', value: 'inserted' });
    });

    expect(mdx(tree)).toMatchInlineSnapshot(`
      "|  th 1 inserted  |  th 2 inserted  |
      | :-------------: | :-------------: |
      | cell 1 inserted | cell 2 inserted |
      "
    `);
  });

  it('converts to magic block syntax if there are breaks', () => {
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;
    const nodes = mdast(markdown);
    const cell = nodes.children[0].children[1].children[0];
    cell.children = [...cell.children, { type: 'break' }, { type: 'text', value: 'extra line' }];

    expect(mdx(nodes)).toBe(`[block:parameters]
{
  "data": {
    "h-0": "th 1",
    "h-1": "th 2",
    "0-0": "cell 1  \\nextra line",
    "0-1": "cell 2"
  },
  "cols": 2,
  "rows": 1,
  "align": [
    "center",
    "center"
  ]
}
[/block]
`);
  });
});
