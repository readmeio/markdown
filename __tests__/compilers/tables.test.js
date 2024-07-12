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

  it('saves to MDX if there are newlines', () => {
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;

    const tree = mdast(markdown);

    visit(tree, 'tableCell', cell => {
      cell.children = [{ type: 'text', value: `${cell.children[0].value}\n🦉` }];
    });

    expect(mdx(tree)).toMatchInlineSnapshot(`
      "<Table align={["center","center"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>
              th 1
              🦉
            </th>

            <th style={{ textAlign: "center" }}>
              th 2
              🦉
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <th style={{ textAlign: "center" }}>
              cell 1
              🦉
            </th>

            <th style={{ textAlign: "center" }}>
              cell 2
              🦉
            </th>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('saves to MDX with lists', () => {
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;
    const list = `
- 1
- 2
- 3
`;

    const tree = mdast(markdown);

    visit(tree, 'tableCell', cell => {
      cell.children = mdast(list).children;
      return EXIT;
    });

    expect(mdx(tree)).toMatchInlineSnapshot(`
      "<Table align={["center","center"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>
              * 1
              * 2
              * 3
            </th>

            <th style={{ textAlign: "center" }}>
              th 2
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <th style={{ textAlign: "center" }}>
              cell 1
            </th>

            <th style={{ textAlign: "center" }}>
              cell 2
            </th>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });
});
