import { visit, EXIT } from 'unist-util-visit';

import { mdast, mdx } from '../../index';

import {
  jsxTableWithInlineCodeWithPipe,
  tableWithInlineCodeWithPipe,
  tableWithInlineCodeWithEscapedPipe,
  tableWithPipe,
} from './tables/fixtures';

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

  it('compiles to jsx syntax', () => {
    const markdown = `
<Table align={["center","center"]}>
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
      <td style={{ textAlign: "center" }}>
        cell 1
        🦉
      </td>

      <td style={{ textAlign: "center" }}>
        cell 2
        🦉
      </td>
    </tr>
  </tbody>
</Table>
`;

    expect(mdx(mdast(markdown))).toBe(`<Table align={["center","center"]}>
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
      <td style={{ textAlign: "center" }}>
        cell 1
        🦉
      </td>

      <td style={{ textAlign: "center" }}>
        cell 2
        🦉
      </td>
    </tr>
  </tbody>
</Table>
`);
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
            <td style={{ textAlign: "center" }}>
              cell 1
              🦉
            </td>

            <td style={{ textAlign: "center" }}>
              cell 2
              🦉
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('saves to MDX if there are newlines and null alignment', () => {
    const markdown = `
|  th 1  |  th 2  |
| ------ | ------ |
| cell 1 | cell 2 |
`;

    const tree = mdast(markdown);

    visit(tree, 'tableCell', cell => {
      cell.children = [{ type: 'text', value: `${cell.children[0].value}\n🦉` }];
    });

    expect(mdx(tree)).toMatchInlineSnapshot(`
      "<Table>
        <thead>
          <tr>
            <th>
              th 1
              🦉
            </th>

            <th>
              th 2
              🦉
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              cell 1
              🦉
            </td>

            <td>
              cell 2
              🦉
            </td>
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
            <td style={{ textAlign: "center" }}>
              cell 1
            </td>

            <td style={{ textAlign: "center" }}>
              cell 2
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('compiles back to markdown syntax if there are no newlines/blocks', () => {
    const markdown = `
<Table align={["center","center"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "center" }}>
        th 1
      </th>

      <th style={{ textAlign: "center" }}>
        th 2
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "center" }}>
        cell 1
      </td>

      <td style={{ textAlign: "center" }}>
        cell 2
      </td>
    </tr>
  </tbody>
</Table>
`;

    expect(mdx(mdast(markdown)).trim()).toBe(
      `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`.trim(),
    );
  });

  it('compiles to jsx if there is a single list item', () => {
    const doc = `
<Table>
  <thead>
    <tr>
      <th>
        * list
      </th>

      <th>
        th 2
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        cell 1
      </td>

      <td>
        cell 2
      </td>
    </tr>
  </tbody>
</Table>
    `;

    const tree = mdast(doc);

    expect(mdx(tree).trim()).toMatchInlineSnapshot(`
      "<Table>
        <thead>
          <tr>
            <th>
              * list
            </th>

            <th>
              th 2
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              cell 1
            </td>

            <td>
              cell 2
            </td>
          </tr>
        </tbody>
      </Table>"
    `);
  });

  it('compiles tables with empty cells', () => {
    const doc = `
| col1 | col2 | col3                     |
| :--- | :--: | :----------------------- |
| →    |      | ← empty cell to the left |
`;
    const ast = mdast(doc);

    expect(() => {
      mdx(ast);
    }).not.toThrow();
  });

  describe('escaping pipes', () => {
    it('compiles tables with pipes in inline code', () => {
      expect(mdx(tableWithInlineCodeWithPipe)).toMatchInlineSnapshot(`
        "|              |    |
        | :----------- | :- |
        | \`foo \\| bar\` |    |
        "
      `);
    });

    it('compiles tables with escaped pipes in inline code', () => {
      expect(mdx(tableWithInlineCodeWithEscapedPipe)).toMatchInlineSnapshot(`
        "|              |    |
        | :----------- | :- |
        | \`foo \\\\| bar\` |    |
        "
      `);
    });

    it('compiles tables with pipes', () => {
      expect(mdx(tableWithPipe)).toMatchInlineSnapshot(`
        "|            |    |
        | :--------- | :- |
        | foo \\| bar |    |
        "
      `);
    });

    it('compiles jsx tables with pipes in inline code', () => {
      expect(mdx(jsxTableWithInlineCodeWithPipe)).toMatchInlineSnapshot(`
        "<Table align={["left","left"]}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>
                force
                jsx
              </th>

              <th style={{ textAlign: "left" }}>

              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={{ textAlign: "left" }}>
                \`foo | bar\`
              </td>

              <td style={{ textAlign: "left" }}>

              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });
  });
});
