import { mdast, mdx } from '../../index';

describe.skip('table compiler', () => {
  it('converts to markdown syntax', () => {
    const markdown = `
[block:parameters]
{
  "data": {
    "h-0": "th 1",
    "h-1": "th 2",
    "0-0": "cell 1",
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
`;

    expect(mdx(mdast(markdown))).toBe(
      `|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`
    );
  });

  it('saves to magic block syntax if there are breaks', () => {
    const markdown = `
[block:parameters]
{
  "data": {
    "h-0": "th 1",
    "h-1": "th 2",
    "0-0": "cell 1\\nextra line",
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
`;

    expect(mdx(mdast(markdown))).toBe(`[block:parameters]
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
