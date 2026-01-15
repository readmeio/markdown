import { EXIT, visit } from 'unist-util-visit';

import { mdast, mdx, mdxish } from '../../index';


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
        | \`foo \\| bar\` |    |
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

describe('mdxish table compiler', () => {
  it('processes Table component with align attribute', () => {
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

    const hast = mdxish(markdown.trim());
    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    // Verify thead exists
    const thead = table.children.find(child => child.type === 'element' && child.tagName === 'thead');
    expect(thead).toBeDefined();

    // Verify tbody exists
    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody');
    expect(tbody).toBeDefined();
  });

  it('processes Table component without align attribute', () => {
    const markdown = `
<Table>
  <thead>
    <tr>
      <th>th 1</th>
      <th>th 2</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>cell 1</td>
      <td>cell 2</td>
    </tr>
  </tbody>
</Table>
`;

    const hast = mdxish(markdown.trim());
    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');
  });

  it('processes Table component with empty cells', () => {
    const markdown = `
<Table>
  <thead>
    <tr>
      <th>col1</th>
      <th>col2</th>
      <th>col3</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>→</td>
      <td></td>
      <td>← empty cell to the left</td>
    </tr>
  </tbody>
</Table>
`;

    const hast = mdxish(markdown.trim());

    expect(() => {
      const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');
      expect(table).toBeDefined();
    }).not.toThrow();
  });

  it('processes Table component with inline code containing pipes', () => {
    const markdown = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>force jsx</th>
      <th style={{ textAlign: "left" }}></th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>\`foo | bar\`</td>
      <td style={{ textAlign: "left" }}></td>
    </tr>
  </tbody>
</Table>
`;

    const hast = mdxish(markdown.trim());
    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    // Backtick-escaped strings in JSX are treated as plain text, not inline code
    // Verify the text content with pipes is preserved
    const td = table.children
      .find(child => child.type === 'element' && child.tagName === 'tbody')
      ?.children.find(child => child.type === 'element' && child.tagName === 'tr')
      ?.children.find(child => child.type === 'element' && child.tagName === 'td');

    expect(td).toBeDefined();
    const textNode = td.children.find(child => child.type === 'text');
    expect(textNode).toBeDefined();
    expect(textNode && 'value' in textNode && textNode.value).toContain('foo | bar');
  });

  it('parses markdown table syntax as table element (GFM supported)', () => {
    // Note: mdxish now supports GFM tables via remarkGfm, so markdown table syntax is parsed as table
    const markdown = `
|  th 1  |  th 2  |
| :----: | :----: |
| cell 1 | cell 2 |
`;

    const hast = mdxish(markdown.trim());
    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    const thead = table.children.find(child => child.type === 'element' && child.tagName === 'thead');
    expect(thead).toBeDefined();

    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody');
    expect(tbody).toBeDefined();

    const th = thead.children
      .find(child => child.type === 'element' && child.tagName === 'tr')
      ?.children.find(child => child.type === 'element' && child.tagName === 'th');
    expect(th).toBeDefined();
    const textNode = th.children.find(child => child.type === 'text');
    expect(textNode).toBeDefined();
    expect(textNode && 'value' in textNode && textNode.value).toContain('th 1');
  });

  it('processes JSX tables with markdown components', () => {
    const markdown = `
<Table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Bold</td>
      <td>**Bold text**</td>
    </tr>
    <tr>
      <td>Italic</td>
      <td>*Italic text*</td>
    </tr>
  </tbody>
</Table>
`;
    const hast = mdxish(markdown.trim());
    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody');
    expect(tbody).toBeDefined();

    const rows = tbody.children.filter(child => child.type === 'element' && child.tagName === 'tr');
    expect(rows).toHaveLength(2);

    // Helper to get text from a cell, optionally through a wrapper element
    const getCellText = (cell, wrapperTag) => {
      if (wrapperTag) {
        const wrapper = cell.children.find(c => c.type === 'element' && c.tagName === wrapperTag);
        const text = wrapper?.children.find(c => c.type === 'text');
        return text?.value;
      }
      const text = cell.children.find(c => c.type === 'text');
      return text?.value;
    };

    // Check first row: Bold | **Bold text**
    const boldCells = rows[0].children.filter(child => child.type === 'element' && child.tagName === 'td');
    expect(boldCells).toHaveLength(2);
    expect(getCellText(boldCells[0])).toBe('Bold');
    expect(getCellText(boldCells[1], 'strong')).toBe('Bold text');

    // Check second row: Italic | *Italic text*
    const italicCells = rows[1].children.filter(child => child.type === 'element' && child.tagName === 'td');
    expect(italicCells).toHaveLength(2);
    expect(getCellText(italicCells[0])).toBe('Italic');
    expect(getCellText(italicCells[1], 'em')).toBe('Italic text');
  });

  it('processes GFM tables with markdown components', () => {
    const markdown = `
| Feature | Description |
|---------|-------------|
| **Bold** | Text with **emphasis** |
| *Italic* | Text with *emphasis* |
| Normal | Regular text |
`;

    const hast = mdxish(markdown.trim());

    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody');
    expect(tbody).toBeDefined();

    const rows = tbody.children.filter(child => child.type === 'element' && child.tagName === 'tr');
    expect(rows).toHaveLength(3);

    // Helper to get text from a cell, optionally through a wrapper element
    const getCellText = (cell, wrapperTag) => {
      if (wrapperTag) {
        const wrapper = cell.children.find(c => c.type === 'element' && c.tagName === wrapperTag);
        const text = wrapper?.children.find(c => c.type === 'text');
        return text?.value;
      }
      const text = cell.children.find(c => c.type === 'text');
      return text?.value;
    };

    // Check first row: **Bold** | Text with **emphasis**
    const boldCells = rows[0].children.filter(child => child.type === 'element' && child.tagName === 'td');
    expect(boldCells).toHaveLength(2);
    expect(getCellText(boldCells[0], 'strong')).toBe('Bold');
    expect(getCellText(boldCells[1], 'strong')).toBe('emphasis');

    // Check second row: *Italic* | Text with *emphasis*
    const italicCells = rows[1].children.filter(child => child.type === 'element' && child.tagName === 'td');
    expect(italicCells).toHaveLength(2);
    expect(getCellText(italicCells[0], 'em')).toBe('Italic');
    expect(getCellText(italicCells[1], 'em')).toBe('emphasis');

    // Check third row: Normal | Regular text
    const normalCells = rows[2].children.filter(child => child.type === 'element' && child.tagName === 'td');
    expect(normalCells).toHaveLength(2);
    expect(getCellText(normalCells[0])).toBe('Normal');
    expect(getCellText(normalCells[1])).toBe('Regular text');
  });

  it('processes GFM tables with long separator lines and long cell content', () => {
    const markdown = `| **File Name**      | **Description**                                                                                                                                                                                                                                                                                                                                                                 |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| styles.css         | A baseline stylesheet containing the application's default styling for buttons, fields, text, and other elements that may appear in the user interface. This file is included in the settings configuration array, which loads it after all other stylesheets are loaded from the platform so that default styles are overridden with the custom theme values specified here. |
| styles-mobile.css  | A stylesheet extending the base styles.css file to optimize the user interface for mobile devices. This file is included in the mobile stylesheets configuration array, which should be placed after the main stylesheets setting so any styling loaded from that file is overridden for mobile viewports and touch-based interactions on smaller screens.                      |`;

    const hast = mdxish(markdown);

    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    const thead = table.children.find(child => child.type === 'element' && child.tagName === 'thead');
    expect(thead).toBeDefined();

    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody');
    expect(tbody).toBeDefined();

    const rows = tbody.children.filter(child => child.type === 'element' && child.tagName === 'tr');
    expect(rows).toHaveLength(2);

    const firstRowCells = rows[0].children.filter(child => child.type === 'element' && child.tagName === 'td');
    expect(firstRowCells).toHaveLength(2);

    const getTextContent = (node) => {
      if (node.type === 'text') return node.value;
      if (node.children) return node.children.map(getTextContent).join('');
      return '';
    };

    const descriptionText = getTextContent(firstRowCells[1]);

    expect(descriptionText).toContain('default styles are overridden');
  });

  it('parses table with malformed separator (colon after pipe is normalized)', () => {
    // The separator row has "|: ---" instead of "| :---"
    const markdown = `| **File Name**      | **Description**                                              |
| :------------------ |: ------------------------------------------------------------ |
| styles.css         | A baseline stylesheet containing the application's default styling for buttons, fields, text, and other elements that may appear in the user interface. |
| styles-mobile.css  | A stylesheet extending the base styles.css file to optimize the user interface for mobile devices and smaller screens. |`;

    const hast = mdxish(markdown);

    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    const thead = table.children.find(child => child.type === 'element' && child.tagName === 'thead');
    expect(thead).toBeDefined();

    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody');
    expect(tbody).toBeDefined();
  });

  it('parses table with double colon typo in separator (e.g., | ::--- instead of | :---)', () => {
    // The separator row has "| ::---" instead of "| :---"
    const markdown = `| **Feature** | **Admin** | **User** |
| :--- | ::--- | ::--- |
| View Dashboard | Yes | Yes |
| Edit Settings | Yes | No |`;

    const hast = mdxish(markdown);

    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table');

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    const thead = table.children.find(child => child.type === 'element' && child.tagName === 'thead');
    expect(thead).toBeDefined();

    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody');
    expect(tbody).toBeDefined();
    
    const rows = tbody.children.filter(child => child.type === 'element' && child.tagName === 'tr');
    expect(rows).toHaveLength(2);
  });
});
