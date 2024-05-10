import { mdast, mdx } from '../../index';
import { visit } from 'unist-util-visit';

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

  it.skip('saves to MDX if there are breaks', () => {
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;

    const tree = mdast(markdown);

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
});
