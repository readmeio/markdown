import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../index';
import { mdxish } from '../../lib/mdxish';

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

      const findNodes = (node, tagName) => {
        const results = [];
        if (node.tagName === tagName) results.push(node);
        if (node.children) node.children.forEach(c => results.push(...findNodes(c, tagName)));
        return results;
      };

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

      const pres = hast.children.filter(c => c.tagName === 'pre');
      expect(pres).toHaveLength(0);

      const bodyCells = findNodes(bodyRows[0], 'td');
      const codeCell = bodyCells[1];
      const codeBlocks = findNodes(codeCell, 'code');
      expect(codeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('jsxTable tokenizer edge cases', () => {
    const findNodes = (node, tagName) => {
      const results: any[] = [];
      if (node.tagName === tagName) results.push(node);
      if (node.children) node.children.forEach((c: any) => results.push(...findNodes(c, tagName)));
      return results;
    };

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

    it('does not tokenize Table-prefixed tags, lowercase table, or Table in code blocks', () => {
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

    it('handles unclosed Table and Table with trailing content', () => {
      expect(() => mdxish('<Table>\n  <thead><tr><th>A</th></tr></thead>')).not.toThrow();
      expect(() => mdxish('<Table>\n  <thead><tr><th>A</th></tr></thead>\n  <tbody><tr><td>1</td></tr></tbody>\n</Table> trailing')).not.toThrow();
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
