import type { Element, Nodes } from 'hast';

import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../index';
import { mdxish } from '../../lib/mdxish';

const findNodes = (node: Nodes, tagName: string): Element[] => {
  const results: Element[] = [];
  if (node.type === 'element' && node.tagName === tagName) results.push(node);
  if ('children' in node) node.children.forEach(c => results.push(...findNodes(c, tagName)));
  return results;
};

describe('table parser', () => {
  describe('unescaping pipes', () => {
    it('parses tables with pipes in inline code', () => {
      const doc = `
|              |    |
| :----------- | :- |
| \`foo \\| bar\` |    |
`;
      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });

    it('parses tables with pipes', () => {
      const doc = `
|            |    |
| :--------- | :- |
| foo \\| bar |    |
`;
      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });

    it('parses jsx tables with pipes in inline code', () => {
      const doc = `
<Table align={["left","left"]}>
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
`;

      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });
  });

  describe('jsx tables with complex cell content', () => {
    it('parses jsx table with code blocks, lists, and inline code via mdxish pipeline', async () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Description
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Fenced code block
      </td>

      <td style={{ textAlign: "left" }}>
        \`\`\`
        {
          "field": "ID",
          "type": "ASC"
        }
        \`\`\`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        Lists
      </td>

      <td style={{ textAlign: "left" }}>
        Oh no

        * no no no
        * no no no
        * Im so sorry
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        Inline code with a pipe
      </td>

      <td style={{ textAlign: "left" }}>
        \`foo | bar\`
      </td>
    </tr>
  </tbody>
</Table>
`;

      const { mdxish: mdxishFn } = await import('../../lib/mdxish');
      const hast = mdxishFn(doc);

      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const thead = findNodes(tables[0], 'thead');
      const tbody = findNodes(tables[0], 'tbody');
      expect(thead).toHaveLength(1);
      expect(tbody).toHaveLength(1);

      const headerRows = findNodes(thead[0], 'tr');
      const bodyRows = findNodes(tbody[0], 'tr');
      expect(headerRows).toHaveLength(1);
      expect(bodyRows).toHaveLength(3);

      const topLevelPres = (hast as unknown as HastNode).children?.filter(c => c.tagName === 'pre') ?? [];
      expect(topLevelPres).toHaveLength(0);

      const bodyCells = findNodes(bodyRows[0], 'td');
      const codeCell = bodyCells[1];
      const codeBlocks = findNodes(codeCell, 'code');
      expect(codeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('jsxTable tokenizer edge cases', () => {
    it('handles multiple blank lines, two tables, empty cells, and safeMode', () => {
      const doc = `<Table>
  <thead>
    <tr>
      <th>A</th>
      <th>B</th>
    </tr>
  </thead>



  <tbody>
    <tr>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</Table>

<Table>
  <thead><tr><th>X</th></tr></thead>

  <tbody><tr><td>1</td></tr></tbody>
</Table>`;

      const hast = mdxish(doc);
      expect(findNodes(hast, 'table')).toHaveLength(2);

      const safeModeHast = mdxish(doc, { safeMode: true });
      expect(findNodes(safeModeHast, 'table')).toHaveLength(2);
    });

    it('does not tokenize Table-prefixed tags or Table in code blocks', () => {
      const doc = `<TableRow>
  <td>not a table</td>
</TableRow>

<Tables>content</Tables>

\`\`\`html
<Table>
  <thead><tr><th>code block</th></tr></thead>
</Table>
\`\`\``;

      const hast = mdxish(doc);
      expect(findNodes(hast, 'table')).toHaveLength(0);
    });

    it.each([
      {
        name: 'blockquote in cell',
        body: `
    <tr>
      <td>

> What's up

      </td>
    </tr>`,
      },
      {
        name: 'fenced code block in cell',
        body: `
    <tr>
      <td>

\`\`\`js
const x = 1;
\`\`\`

      </td>
    </tr>`,
      },
      {
        name: 'unordered list in cell',
        body: `
    <tr>
      <td>

* one
* two
* three

      </td>
    </tr>`,
      },
      {
        name: 'ordered list in cell',
        body: `
    <tr>
      <td>

1. first
2. second
3. third

      </td>
    </tr>`,
      },
      {
        name: 'heading in cell',
        body: `
    <tr>
      <td>

## Sub-heading

      </td>
    </tr>`,
      },
      {
        name: 'emphasis and strong in cell',
        body: `
    <tr>
      <td>This is *italic* and **bold**</td>
    </tr>`,
      },
      {
        name: 'inline code in cell',
        body: `
    <tr>
      <td>\`inline code\`</td>
    </tr>`,
      },
      {
        name: 'link in cell',
        body: `
    <tr>
      <td>[Example](https://example.com)</td>
    </tr>`,
      },
      {
        name: 'image in cell',
        body: `
    <tr>
      <td>![alt](https://example.com/img.png)</td>
    </tr>`,
      },
      {
        name: 'multiple rows with mixed content',
        body: `
    <tr>
      <td>Plain text</td>
      <td>**bold**</td>
    </tr>
    <tr>
      <td>

> quoted

      </td>
      <td>

* listed

      </td>
    </tr>`,
      },
      {
        name: 'empty cells',
        body: `
    <tr>
      <td></td>
      <td></td>
    </tr>`,
      },
      {
        name: 'multiple blank lines between sections',
        body: `
    <tr>
      <td>


> deep blanks


      </td>
    </tr>`,
      },
      {
        name: 'cell with horizontal rule',
        body: `
    <tr>
      <td>

---

      </td>
    </tr>`,
      },
    ])('<table> matches <Table> output: $name', ({ body }) => {
      const thead = `
  <thead>
    <tr>
      <th>Heading</th>
    </tr>
  </thead>`;

      const uppercaseDoc = `<Table>${thead}\n  <tbody>${body}\n  </tbody>\n</Table>`;
      const lowercaseDoc = `<table>${thead}\n  <tbody>${body}\n  </tbody>\n</table>`;

      const uppercaseHast = mdxish(uppercaseDoc);
      const lowercaseHast = mdxish(lowercaseDoc);

      removePosition(uppercaseHast, { force: true });
      removePosition(lowercaseHast, { force: true });

      const uppercaseTable = findNodes(uppercaseHast, 'table');
      const lowercaseTable = findNodes(lowercaseHast, 'table');
      expect(lowercaseTable).toHaveLength(1);
      expect(lowercaseTable[0]).toStrictEqual(uppercaseTable[0]);
    });

    it('does not break when cell contains escaped closing tag', () => {
      const doc = `<Table>
  <tbody>
    <tr>
      <td>Literal closing tag as text</td>
      <td>\\</Table> should not be separated</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const bodyCells = findNodes(tables[0], 'td');
      expect(bodyCells).toHaveLength(2);
      const textNode = bodyCells[1].children[0];
      expect(textNode.type === 'text' && textNode.value).toContain('</Table> should not be separated');
    });

    it('renders table when tr and th are on a single line', () => {
      const doc = `<Table>
  <thead>
  <tr><th>A</th></tr>
  </thead>
</Table>`;

      const hast = mdxish(doc);
      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findNodes(tables[0], 'th');
      expect(cells).toHaveLength(1);
      const textNode = cells[0].children[0];
      expect(textNode.type === 'text' && textNode.value).toBe('A');
    });

    it('keeps table as JSX when thead is missing so body rows are not promoted to header', () => {
      const doc = `<Table>
  <tbody>
    <tr>
      <td>body cell</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const thead = findNodes(tables[0], 'thead');
      expect(thead).toHaveLength(0);

      const bodyCells = findNodes(tables[0], 'td');
      expect(bodyCells).toHaveLength(1);
    });

    it('renders table inside a blockquote', () => {
      const doc = `> <Table>
>   <tbody>
>     <tr><td>quoted</td></tr>
>   </tbody>
> </Table>
>
> text after quote`;

      const hast = mdxish(doc);
      const blockquotes = findNodes(hast, 'blockquote');
      expect(blockquotes).toHaveLength(1);

      const tables = findNodes(blockquotes[0], 'table');
      expect(tables).toHaveLength(1);

      const bodyCells = findNodes(tables[0], 'td');
      expect(bodyCells).toHaveLength(1);
    });

    it('handles nested tables', () => {
      const doc = `<Table>
  <tbody>
    <tr>
      <td>
        <Table>
          <tbody>
            <tr>
              <td>Nested Table</td>
            </tr>
          </tbody>
        </Table>
      </td>
      <td>Hi</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const allTables = findNodes(hast, 'table');
      expect(allTables).toHaveLength(2);

      const outerTable = allTables[0];
      const outerRows = findNodes(outerTable, 'tr');
      expect(outerRows.length).toBeGreaterThanOrEqual(1);

      const outerRow = outerRows[0];
      const outerTds = outerRow.children.filter(
        (c): c is Element => c.type === 'element' && c.tagName === 'td',
      );
      expect(outerTds).toHaveLength(2);

      const nestedTables = findNodes(outerTds[0], 'table');
      expect(nestedTables).toHaveLength(1);

      const innerCells = findNodes(nestedTables[0], 'td');
      expect(innerCells).toHaveLength(1);
      expect(innerCells[0].children[0]).toMatchObject({ type: 'text', value: 'Nested Table' });
    });

    it('handles unclosed Table and Table with trailing content', () => {
      expect(() => mdxish('<Table>\n  <thead><tr><th>A</th></tr></thead>')).not.toThrow();
      expect(() =>
        mdxish(
          '<Table>\n  <thead><tr><th>A</th></tr></thead>\n  <tbody><tr><td>1</td></tr></tbody>\n</Table> trailing',
        ),
      ).not.toThrow();
    });

    it.each([
      ['single backticks', '`</Table>`'],
      ['double backticks', '``</Table>``'],
      ['triple backticks', '```</Table>```'],
    ])('does not treat </Table> inside %s as a closing tag', (_label, code) => {
      const doc = `<Table>
  <tbody>
    <tr>
      <td>Closing tag in code</td>
      <td>This ${code} should be auto-escaped.</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findNodes(tables[0], 'td');
      expect(cells).toHaveLength(2);
    });

    it('does not swallow content after an unclosed Table', () => {
      const doc = `<Table>
  <tbody>
    <tr>
      <td>Closing tag in code</td>
    </tr>
  </tbody>

None of the following content will get rendered!`;

      const hast = mdxish(doc);
      const paragraphs = findNodes(hast, 'p');
      const textContent = JSON.stringify(hast);
      expect(textContent).toContain('None of the following content will get rendered!');
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });

  describe('jsx tables with multi code tabs', () => {
    it('groups consecutive code blocks in a cell into code-tabs', async () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Example
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Multi code tabs
      </td>

      <td style={{ textAlign: "left" }}>
        \`\`\`javascript
        const a = 1;
        \`\`\`
        \`\`\`python
        a = 1
        \`\`\`
      </td>
    </tr>
  </tbody>
</Table>
`;

      const { mdxish: mdxishFn } = await import('../../lib/mdxish');
      const hast = mdxishFn(doc);

      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findNodes(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(1);

      const codeBlocks = findNodes(codeTabs[0], 'code');
      expect(codeBlocks).toHaveLength(2);
    });

    it('groups three consecutive code blocks in a cell into a single code-tabs', async () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Example
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Three tabs
      </td>

      <td style={{ textAlign: "left" }}>
        \`\`\`javascript
        const a = 1;
        \`\`\`
        \`\`\`python
        a = 1
        \`\`\`
        \`\`\`ruby
        a = 1
        \`\`\`
      </td>
    </tr>
  </tbody>
</Table>
`;

      const { mdxish: mdxishFn } = await import('../../lib/mdxish');
      const hast = mdxishFn(doc);

      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findNodes(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(1);

      const codeBlocks = findNodes(codeTabs[0], 'code');
      expect(codeBlocks).toHaveLength(3);
    });

    it('does not group a single code block into code-tabs when it has no lang or meta', async () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Example
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Single code block
      </td>

      <td style={{ textAlign: "left" }}>
        \`\`\`
        const a = 1;
        \`\`\`
      </td>
    </tr>
  </tbody>
</Table>
`;

      const { mdxish: mdxishFn } = await import('../../lib/mdxish');
      const hast = mdxishFn(doc);

      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findNodes(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(0);

      const codeBlocks = findNodes(tables[0], 'code');
      expect(codeBlocks).toHaveLength(1);
    });

    it('wraps a single code block with lang into code-tabs', async () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Example
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Single with lang
      </td>

      <td style={{ textAlign: "left" }}>
        \`\`\`javascript
        const a = 1;
        \`\`\`
      </td>
    </tr>
  </tbody>
</Table>
`;

      const { mdxish: mdxishFn } = await import('../../lib/mdxish');
      const hast = mdxishFn(doc);

      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findNodes(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(1);
    });

    it('handles code tabs in multiple cells across different rows', async () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Example
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        First
      </td>

      <td style={{ textAlign: "left" }}>
        \`\`\`javascript
        const a = 1;
        \`\`\`
        \`\`\`python
        a = 1
        \`\`\`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        Second
      </td>

      <td style={{ textAlign: "left" }}>
        \`\`\`go
        a := 1
        \`\`\`
        \`\`\`rust
        let a = 1;
        \`\`\`
      </td>
    </tr>
  </tbody>
</Table>
`;

      const { mdxish: mdxishFn } = await import('../../lib/mdxish');
      const hast = mdxishFn(doc);

      const tables = findNodes(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findNodes(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(2);
    });
  });

  describe('jsx tables with images', () => {
    it('parses jsx tables with images in cells', () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th>Image</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>![](https://example.com/image.png)</td>
      <td>An image</td>
    </tr>
  </tbody>
</Table>
`;

      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });
  });
});
