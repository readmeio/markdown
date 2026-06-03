import type { Element } from 'hast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { toHtml } from 'hast-util-to-html';
import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../lib';
import { mdxish } from '../../lib/mdxish';
import { collectNodes, findAllElementsByTagName, parseMdxishWithSource } from '../helpers';

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

      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const thead = findAllElementsByTagName(tables[0], 'thead');
      const tbody = findAllElementsByTagName(tables[0], 'tbody');
      expect(thead).toHaveLength(1);
      expect(tbody).toHaveLength(1);

      const headerRows = findAllElementsByTagName(thead[0], 'tr');
      const bodyRows = findAllElementsByTagName(tbody[0], 'tr');
      expect(headerRows).toHaveLength(1);
      expect(bodyRows).toHaveLength(3);

      const topLevelPres = hast.children.filter(c => c.type === 'element' && c.tagName === 'pre');
      expect(topLevelPres).toHaveLength(0);

      const bodyCells = findAllElementsByTagName(bodyRows[0], 'td');
      const codeCell = bodyCells[1];
      const codeBlocks = findAllElementsByTagName(codeCell, 'code');
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
      expect(findAllElementsByTagName(hast, 'table')).toHaveLength(2);

      const safeModeHast = mdxish(doc, { safeMode: true });
      expect(findAllElementsByTagName(safeModeHast, 'table')).toHaveLength(2);
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
      expect(findAllElementsByTagName(hast, 'table')).toHaveLength(0);
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

      const uppercaseTable = findAllElementsByTagName(uppercaseHast, 'table');
      const lowercaseTable = findAllElementsByTagName(lowercaseHast, 'table');
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
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const bodyCells = findAllElementsByTagName(tables[0], 'td');
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
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'th');
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
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const thead = findAllElementsByTagName(tables[0], 'thead');
      expect(thead).toHaveLength(0);

      const bodyCells = findAllElementsByTagName(tables[0], 'td');
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
      const blockquotes = findAllElementsByTagName(hast, 'blockquote');
      expect(blockquotes).toHaveLength(1);

      const tables = findAllElementsByTagName(blockquotes[0], 'table');
      expect(tables).toHaveLength(1);

      const bodyCells = findAllElementsByTagName(tables[0], 'td');
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
      const allTables = findAllElementsByTagName(hast, 'table');
      expect(allTables).toHaveLength(2);

      const outerTable = allTables[0];
      const outerRows = findAllElementsByTagName(outerTable, 'tr');
      expect(outerRows.length).toBeGreaterThanOrEqual(1);

      const outerRow = outerRows[0];
      const outerTds = outerRow.children.filter(
        (c): c is Element => c.type === 'element' && c.tagName === 'td',
      );
      expect(outerTds).toHaveLength(2);

      const nestedTables = findAllElementsByTagName(outerTds[0], 'table');
      expect(nestedTables).toHaveLength(1);

      const innerCells = findAllElementsByTagName(nestedTables[0], 'td');
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
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
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
      const paragraphs = findAllElementsByTagName(hast, 'p');
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

      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findAllElementsByTagName(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(1);

      const codeBlocks = findAllElementsByTagName(codeTabs[0], 'code');
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

      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findAllElementsByTagName(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(1);

      const codeBlocks = findAllElementsByTagName(codeTabs[0], 'code');
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

      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findAllElementsByTagName(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(0);

      const codeBlocks = findAllElementsByTagName(tables[0], 'code');
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

      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findAllElementsByTagName(hast, 'CodeTabs');
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

      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const codeTabs = findAllElementsByTagName(hast, 'CodeTabs');
      expect(codeTabs).toHaveLength(2);
    });
  });

  describe('jsx table mdxish pipeline regression tests', () => {
    it('translates re-parsed flow content positions into outer source coordinates', () => {
      const doc = `Some preceding paragraph.

<Table align={["left","left"]}>
  <thead>
    <tr><th>Name</th><th>Domains</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Foo</td>
      <td>
        <ul>
          <li>one.example.com</li>
          <li>two.example.com</li>
        </ul>
      </td>
    </tr>
  </tbody>
</Table>`;

      const { source, tree } = parseMdxishWithSource(doc);

      const tables = collectNodes(tree, n => n.type === 'table');
      expect(tables).toHaveLength(1);

      const jsxNodes = collectNodes<MdxJsxFlowElement | MdxJsxTextElement>(
        tables[0],
        (n): n is MdxJsxFlowElement | MdxJsxTextElement =>
          n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement',
      );
      expect(jsxNodes.length).toBeGreaterThan(0);

      // If the slice at [start, end] doesn't begin with the node's own tag,
      // the position is stale (inner-coordinate) or drifted off-by-N from
      // broken chunk reassembly, either breaks nodeToSource in the editor.
      jsxNodes.forEach(node => {
        expect(node.position).toBeDefined();
        const slice = source.slice(node.position!.start.offset, node.position!.end.offset);
        expect(slice.startsWith(`<${node.name}`)).toBe(true);
      });
    });

    it('parses two adjacent tables with mixed cell content into independent structured mdast', () => {
      const doc = `<Table>
  <thead>
    <tr><th>Hello</th></tr>
  </thead>
  <tbody>
    <tr><td>world</td></tr>
  </tbody>
</Table>

<Table align={["left","left"]}>
  <thead>
    <tr><th>Name</th><th>Domains</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Foo</td>
      <td>
        <ul>
          <li>one.example.com</li>
          <li>two.example.com</li>
        </ul>
      </td>
    </tr>
  </tbody>
</Table>`;

      const { source, tree } = parseMdxishWithSource(doc);

      // The marker is internal plumbing for JSX expression attributes, this
      // marker should never be surfaced in the output tree.
      expect(JSON.stringify(tree)).not.toContain('__MDXISH_JSON__');

      const tables = collectNodes(tree, n => n.type === 'table');
      expect(tables).toHaveLength(2);

      const firstTableText = JSON.stringify(tables[0]);
      expect(firstTableText).toContain('Hello');
      expect(firstTableText).toContain('world');
      expect(firstTableText).not.toContain('Name');
      expect(firstTableText).not.toContain('Domains');
      expect(firstTableText).not.toContain('example.com');

      const secondTableText = JSON.stringify(tables[1]);
      expect(secondTableText).toContain('Name');
      expect(secondTableText).toContain('Domains');
      expect(secondTableText).toContain('Foo');

      const secondTableLists = collectNodes<MdxJsxFlowElement>(
        tables[1],
        (n): n is MdxJsxFlowElement => n.type === 'mdxJsxFlowElement' && (n as MdxJsxFlowElement).name === 'ul',
      );
      expect(secondTableLists).toHaveLength(1);
      const secondTableItems = collectNodes<MdxJsxTextElement>(
        secondTableLists[0],
        (n): n is MdxJsxTextElement => n.type === 'mdxJsxTextElement' && (n as MdxJsxTextElement).name === 'li',
      );
      expect(secondTableItems).toHaveLength(2);

      const allJsxNodes = tables.flatMap(t =>
        collectNodes<MdxJsxFlowElement | MdxJsxTextElement>(
          t,
          (n): n is MdxJsxFlowElement | MdxJsxTextElement =>
            n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement',
        ),
      );

      allJsxNodes.forEach(node => {
        expect(node.position).toBeDefined();
        const slice = source.slice(node.position!.start.offset, node.position!.end.offset);
        expect(slice.startsWith(`<${node.name}`)).toBe(true);
      });
    });
  });

  describe('jsx tables with bare cells (no <tr> wrapper)', () => {
    it('renders header row when <thead> contains <th>s without an explicit <tr> wrapper', () => {
      const doc = `<table>
<thead>
<th>Question</th>
<th>Answer</th>
</thead>
<tbody>
<tr>
<td>q1</td>
<td>a1</td>
</tr>
</tbody>
</table>`;

      const tree = mdxish(doc);
      const json = JSON.stringify(tree);

      expect(json).toContain('"tagName":"th"');
      expect(json).toContain('"value":"Question"');
      expect(json).toContain('"value":"Answer"');
    });

    it('renders body row when <tbody> contains <td>s without an explicit <tr> wrapper', () => {
      const doc = `<table>
<thead>
<tr>
<th>Question</th>
</tr>
</thead>
<tbody>
<td>bare-cell</td>
</tbody>
</table>`;

      const tree = mdxish(doc);
      const json = JSON.stringify(tree);

      expect(json).toContain('"value":"bare-cell"');
    });

    it('chunks bare <td>s into multiple body rows using the header column count', () => {
      const doc = `<table>
  <thead>
    <td>Hi</td>
    <td>World</td>
  </thead>
  <tbody>
    <td>Hello</td>
    <td>Globe</td>
    <td>Hello</td>
    <td>Globe</td>
  </tbody>
</table>`;

      const bodyRows = findAllElementsByTagName(mdxish(doc) as unknown as Element, 'tbody')[0].children
        .filter((c): c is Element => (c as Element).tagName === 'tr')
        .map(tr => tr.children.filter((c): c is Element => (c as Element).tagName === 'td').map(td => (td.children[0] as { value: string }).value));

      expect(bodyRows).toStrictEqual([
        ['Hello', 'Globe'],
        ['Hello', 'Globe'],
      ]);
    });

    it('preserves multiple <tr>s inside <tbody> when remarkMdx wraps them in a paragraph', () => {
      const doc = `<Table>
<thead><tr><th>L</th></tr></thead>
<tbody>
<tr><td>1</td></tr>
<tr><td>2</td></tr>
<tr><td>3</td></tr>
</tbody>
</Table>`;

      const bodyRows = findAllElementsByTagName(mdxish(doc) as unknown as Element, 'tbody')[0].children
        .filter((c): c is Element => (c as Element).tagName === 'tr')
        .map(tr => tr.children.filter((c): c is Element => (c as Element).tagName === 'td').map(td => (td.children[0] as { value: string }).value));

      expect(bodyRows).toStrictEqual([['1'], ['2'], ['3']]);
    });
  });

  describe('jsx tables with legacy variables', () => {
    it('preserves <<variable>> when another cell triggers the malformed-retry path', () => {
      const doc = `<Table>
  <thead>
    <tr><th>A</th><th>B</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Hello <<NAME>>!</td>
      <td>
        <span style="color:red">unclosed span here

        across paragraphs.
      </td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const variables = findAllElementsByTagName(tables[0], 'variable');
      expect(variables).toHaveLength(1);
      expect(variables[0].properties).toMatchObject({ name: 'NAME', isLegacy: true });
    });

    it('does not treat <<string> as a phantom tag during malformed-retry', () => {
      const doc = `<Table>
  <thead>
    <tr><th>A</th><th>B</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>literal <<string> here</td>
      <td>
        <span style="color:red">unclosed span

        more text.
      </td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);
    });

    it('parses markdown and <<variable>> syntax inside cells', () => {
      const doc = '<table><tr><td>**bold** <<NAME>></td></tr></table>';

      const tree = mdxish(doc);
      removePosition(tree, { force: true });

      expect(tree).toStrictEqual({
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'table',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'tr',
                properties: {},
                children: [
                  {
                    type: 'element',
                    tagName: 'td',
                    properties: {},
                    children: [
                      {
                        type: 'element',
                        tagName: 'strong',
                        properties: {},
                        children: [{ type: 'text', value: 'bold' }],
                      },
                      {
                        type: 'element',
                        tagName: 'variable',
                        properties: { name: 'NAME', isLegacy: true },
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        data: { quirksMode: false },
      });
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

  describe('code content preservation in table cells', () => {
    it('preserves <code> content containing {expression} patterns verbatim (RM-16556)', () => {
      const doc = `<table>
    <thead>
        <th>Attribute</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>
            <td><code>action</code></td>
            <td>Contains: <ul><li><code>deny_custom_{custom_deny_id}</code>. Custom action.</li></ul></td>
        </tr>
    </tbody>
</table>`;

      const hast = mdxish(doc);
      const html = toHtml(hast);

      expect(html).toContain('<code>deny_custom_{custom_deny_id}</code>');
    });

    it('does not apply emphasis to underscores inside <code> elements in table cells', () => {
      const doc = `<table>
    <thead><tr><th>Name</th><th>Type</th></tr></thead>
    <tbody>
        <tr>
          <td>field</td>
          <td>Contains: <ul><li><code>snake_case_value</code></li><li><code>another_name_here</code></li></ul></td>
        </tr>
    </tbody>
</table>`;

      const hast = mdxish(doc);
      const html = toHtml(hast);

      expect(html).toContain('<code>snake_case_value</code>');
      expect(html).toContain('<code>another_name_here</code>');
    });

    it('preserves <code> content with underscores and {expression} in GFM-style markdown tables (RM-16575)', () => {
      const doc = `|Attribute|Description|
|---|---|
|\`action\`|Action taken any time the penalty box is triggered. Contains: <ul><li><code>alert</code>. Event recorded.</li><li><code>deny</code>. Event blocked.</li><li><code>deny_custom_{custom_deny_id}</code>. Took your custom action against the event.</li><li><code>none</code>. No action taken.</li></ul>|
|\`enabled\`|If **true**, penalty box protection is enabled.|`;

      const hast = mdxish(doc);
      const html = toHtml(hast);

      expect(html).toContain('<code>deny_custom_{custom_deny_id}</code>');
      expect(html).toContain('<code>alert</code>');
      expect(html).toContain('<code>deny</code>');
      expect(html).toContain('<code>none</code>');
    });

    it('does not apply emphasis to underscores inside inline <code> elements in GFM tables', () => {
      const doc = `|Name|Type|
|---|---|
|field|Contains: <ul><li><code>snake_case_value</code></li><li><code>another_name_here</code></li></ul>|`;

      const hast = mdxish(doc);
      const html = toHtml(hast);

      expect(html).toContain('<code>snake_case_value</code>');
      expect(html).toContain('<code>another_name_here</code>');
    });
  });

  describe('tables with no <tbody> wrapper', () => {
    it.each([['Table'], ['table']])(
      'still renders all the rows in a <%s> with no <tbody> wrapper',
      tag => {
        const doc = `<${tag}>
  <thead><tr><th>col</th></tr></thead>
  <tr><td>row 1</td></tr>
  <tr><td>row 2</td></tr>
</${tag}>`;

        const hast = mdxish(doc);
        const tables = findAllElementsByTagName(hast, 'table');
        expect(tables).toHaveLength(1);

        const rows = findAllElementsByTagName(tables[0], 'tr');
        expect(rows).toHaveLength(3);
      },
    );
  });

  describe('tables with no <thead> wrapper', () => {
    it.each([['Table'], ['table']])(
      'still renders all the rows in a <%s> with no <thead> wrapper',
      tag => {
        const doc = `<${tag}>
  <tr><th>col</th></tr>
  <tr><td>row 1</td></tr>
  <tr><td>row 2</td></tr>
</${tag}>`;

        const hast = mdxish(doc);
        const tables = findAllElementsByTagName(hast, 'table');
        expect(tables).toHaveLength(1);

        const rows = findAllElementsByTagName(tables[0], 'tr');
        expect(rows).toHaveLength(3);

        const headerRow = findAllElementsByTagName(tables[0], 'th');
        expect(headerRow).toHaveLength(1);
      },
    );
  });
});
