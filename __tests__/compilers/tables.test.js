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

  it('saves to MDX if there are newlines', () => {
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;

    const tree = mdast(markdown);

    visit(tree, 'tableCell', cell => {
      cell.children = [{ type: 'text', value: `${cell.children[0].value}\n\n🦉` }];
    });

    expect(mdx(tree)).toMatchInlineSnapshot(`
      "<Table>
        <thead>
          <tr>
            <th style={{ align: "center" }}>
              th 1

              🦉
            </th>

            <th style={{ align: "center" }}>
              th 2

              🦉
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <th style={{ align: "center" }}>
              cell 1

              🦉
            </th>

            <th style={{ align: "center" }}>
              cell 2

              🦉
            </th>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });
});
