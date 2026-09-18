import type { Parent, Root, Root as MdastRoot, Table, TableCell } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import mdxishTablesToJsx from '../../processor/transform/mdxish/tables/mdxish-tables-to-jsx';
import { collectNodes, parseMdxish, roundTripMdxish } from '../helpers';

/**
 * A pipe table cannot express a multi-line cell, so the CX-3773 cases have to start
 * from `<Table>` and be round-tripped back through the serializer.
 */
const tableWithCell = (cell: string): string =>
  [
    '<Table align={["left","left"]}>',
    '<thead>',
    '<tr>',
    '<th>Field</th>',
    '<th>Notes</th>',
    '</tr>',
    '</thead>',
    '<tbody>',
    '<tr>',
    '<td>',
    cell,
    '</td>',
    '<td>x</td>',
    '</tr>',
    '</tbody>',
    '</Table>',
    '',
  ].join('\n');

const stayedJsx = (markdown: string): boolean => /^<Table/m.test(markdown);

const parseWithPlugin = (markdown: string): Root => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => (tree: Root) => mdxishTablesToJsx()(tree) ?? undefined);
  const tree = processor.parse(markdown);
  processor.runSync(tree);
  return tree as Root;
};

/** The first body cell of a two-column table — indexes 0 and 1 are the header cells. */
const firstBodyCell = (markdown: string): Parent => collectNodes<Parent>(parseWithPlugin(markdown), 'tableCell')[2];

describe('mdxish-tables-to-jsx', () => {
  describe('plain GFM tables (no flow content)', () => {
    it('leaves a simple text table as a GFM table node', () => {
      const tree = parseWithPlugin('| a | b |\n| --- | --- |\n| c | d |');
      const tables = collectNodes(tree, 'table');

      expect(tables).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('leaves a table with inline formatting as GFM', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| **bold** and _italic_ |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('leaves a table with empty cells as GFM', () => {
      const tree = parseWithPlugin('| a | b |\n| --- | --- |\n| | d |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
    });
  });

  describe('tables with flow content (converted to JSX)', () => {
    it('converts a table containing a self-closing JSX component to JSX', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| <Image src="x.png" /> |');
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement');
      const tables = jsxElements.filter(n => (n as { name?: string }).name === 'Table');

      expect(tables).toHaveLength(1);
      expect(collectNodes(tree, 'table')).toHaveLength(0);
    });
  });

  // GFM pipe syntax has no way to express a column width, so a table that
  // carries one must take the JSX path even when every cell is plain text.
  describe('tables with column widths', () => {
    const tableWithWidths = (widths: (string | null)[]): Root => {
      const tree = parseWithPlugin('| a | b |\n| --- | --- |\n| c | d |');
      const table = collectNodes<Parent>(tree, 'table')[0];
      table.data = { widths };
      return tree;
    };

    const runPlugin = (tree: Root): Root => {
      mdxishTablesToJsx()(tree);
      return tree;
    };

    // In these assertions a `table` node is a GFM pipe table, while an element named `Table`
    // is the JSX component the plugin promotes to.
    it('promotes a plain text table to JSX when any column has a width', () => {
      const tree = runPlugin(tableWithWidths(['30%', null]));

      expect(collectNodes(tree, 'table')).toHaveLength(0);
      expect(collectNodes(tree, n => (n as { name?: string }).name === 'Table')).toHaveLength(1);
    });

    it('keeps the table as GFM when every width is empty', () => {
      const tree = runPlugin(tableWithWidths([null, null]));

      expect(collectNodes(tree, 'table')).toHaveLength(1);
    });

    it('writes the width onto the header cell style and leaves body cells alone', () => {
      const tree = runPlugin(tableWithWidths(['30%', null]));
      const [th1, th2] = collectNodes<MdxJsxFlowElement>(tree, n => (n as { name?: string }).name === 'th');
      const tds = collectNodes<MdxJsxFlowElement>(tree, n => (n as { name?: string }).name === 'td');

      expect(th1.attributes).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'style',
          value: { type: 'mdxJsxAttributeValueExpression', value: '{ width: "30%" }' },
        },
      ]);
      expect(th2.attributes).toStrictEqual([]);
      tds.forEach(td => expect(td.attributes ?? []).toStrictEqual([]));
    });

    it('combines a width with a non-default alignment in one style object', () => {
      const tree = tableWithWidths(['30%', null]);
      collectNodes<Table>(tree, 'table')[0].align = ['center', null];
      runPlugin(tree);
      const [th1] = collectNodes<MdxJsxFlowElement>(tree, n => (n as { name?: string }).name === 'th');

      expect(th1.attributes[0]).toMatchObject({
        name: 'style',
        value: { value: '{ textAlign: "center", width: "30%" }' },
      });
    });
  });

  describe('tables with raw HTML (kept as GFM)', () => {
    it('keeps a table with a raw HTML block as GFM', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| <div>hello</div> |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('keeps a table with unclosed HTML tags as GFM', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| <br> |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
    });
  });

  // CX-3773: line breaks are representable inline in GFM as <br />, so they must not
  // silently promote a pipe table to <Table>.
  describe('line breaks in a cell (CX-3773)', () => {
    it.each([
      ['a single soft line break', 'one\ntwo'],
      ['a hard break written as a trailing backslash', 'one\\\ntwo'],
      ['a hard break written as two trailing spaces', 'one  \ntwo'],
    ])('normalizes %s to <br /> and keeps the table as GFM', (_label, cell) => {
      const markdown = roundTripMdxish(tableWithCell(cell));

      expect(stayedJsx(markdown)).toBe(false);
      expect(markdown).toContain('one<br />two');
    });

    it('emits a br element rather than a newline in the cell AST', () => {
      const cell = firstBodyCell(roundTripMdxish(tableWithCell('one\ntwo')));

      expect(cell).toMatchObject({
        type: 'tableCell',
        children: [
          { type: 'text', value: 'one' },
          { type: 'html', value: '<br />' },
          { type: 'text', value: 'two' },
        ],
      });
    });

    it('normalizes a line break nested inside strong formatting', () => {
      const cell = firstBodyCell(roundTripMdxish(tableWithCell('**one\ntwo**')));

      expect(cell).toMatchObject({
        type: 'tableCell',
        children: [
          {
            type: 'strong',
            children: [
              { type: 'text', value: 'one' },
              { type: 'html', value: '<br />' },
              { type: 'text', value: 'two' },
            ],
          },
        ],
      });
    });

    it('leaves an author-written <br /> untouched', () => {
      const markdown = roundTripMdxish(tableWithCell('one<br />two'));

      expect(stayedJsx(markdown)).toBe(false);
      expect(markdown).toContain('one<br />two');
    });

    it('keeps blank-line separated paragraphs as JSX, since a break is not a paragraph', () => {
      expect(stayedJsx(roundTripMdxish(tableWithCell('one\n\ntwo')))).toBe(true);
    });

    it('keeps a newline inside inline code as JSX, since it has no inline equivalent', () => {
      expect(stayedJsx(roundTripMdxish(tableWithCell('`one\ntwo`')))).toBe(true);
    });

    it('round-trips a normalized break without drifting', () => {
      const once = roundTripMdxish(tableWithCell('one\ntwo'));

      expect(roundTripMdxish(once)).toBe(once);
    });

    // Guards the promote path, which must keep collapsing `break` to a newline: leaving the
    // node intact serializes a dangling `\` into the `<td>`. (That cell's own round trip has
    // a separate, pre-existing instability, so this asserts the serialized shape only.)
    it('collapses a break in a cell of a table that still promotes', () => {
      const source = tableWithCell('one\\\ntwo').replace('<td>x</td>', '<td>\n\n```js\nx\n```\n\n</td>');
      const serialized = roundTripMdxish(source);

      expect(stayedJsx(serialized)).toBe(true);
      expect(serialized).not.toContain('\\\n');
    });
  });

  describe('lists in a cell', () => {
    it.each([
      ['a bare marker', '-'],
      ['an item that has content', '- one'],
      ['a task-list item', '- [ ] done'],
    ])('keeps a list with %s as JSX', (_label, cell) => {
      expect(stayedJsx(roundTripMdxish(tableWithCell(cell)))).toBe(true);
    });
  });

  describe('JSX Table structure', () => {
    it('generates thead, tbody, tr, th, and td elements', () => {
      const tree = parseWithPlugin('| H1 | H2 |\n| --- | --- |\n| <Image src="a.png" /> | text |');
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name: string })[];
      const names = jsxElements.map(n => n.name);

      expect(names).toContain('Table');
      expect(names).toContain('thead');
      expect(names).toContain('tbody');
      expect(names).toContain('tr');
      expect(names).toContain('th');
      expect(names).toContain('td');
    });

    it('preserves alignment as an attribute on the Table element', () => {
      const tree = parseWithPlugin(
        '| Left | Center | Right |\n| :--- | :---: | ---: |\n| <Image src="a.png" /> | b | c |',
      );
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & {
        attributes: { name: string; value: { value: string } }[];
        name: string;
      })[];
      const tableNode = jsxElements.find(n => n.name === 'Table');

      expect(tableNode).toBeDefined();
      const alignAttr = tableNode!.attributes.find(a => a.name === 'align');
      expect(alignAttr).toBeDefined();
      expect(JSON.parse(alignAttr!.value.value)).toStrictEqual(['left', 'center', 'right']);
    });

    it('omits the align attribute when all columns are left-aligned', () => {
      const tree = parseWithPlugin('| A | B |\n| --- | --- |\n| <Image src="a.png" /> | x |');
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & {
        attributes: { name: string }[];
        name: string;
      })[];
      const tableNode = jsxElements.find(n => n.name === 'Table');

      expect(tableNode).toBeDefined();
      expect(tableNode!.attributes).toHaveLength(0);
    });
  });

  describe('multi-child cell scanning', () => {
    it('detects flow content in any child of a cell, not just the first', () => {
      const md = '| Header |\n| --- |\n| text <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name?: string })[];
      const tableNode = jsxElements.find(n => n.name === 'Table');

      expect(tableNode).toBeDefined();
    });

    it('keeps GFM when all children are phrasing content', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| hello **world** |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });
  });

  describe('lowercase tables', () => {
    const listCell = ['<ul>', '<li>one</li>', '<li>two</li>', '</ul>'].join('\n');

    const lowercaseTableWithCell = (cell: string, openTag = '<table>'): string =>
      [
        openTag,
        '<thead>',
        '<tr>',
        '<th>Name</th>',
        '<th>Notes</th>',
        '</tr>',
        '</thead>',
        '<tbody>',
        '<tr>',
        '<td>Foo</td>',
        '<td>',
        cell,
        '</td>',
        '</tr>',
        '</tbody>',
        '</table>',
        '',
      ].join('\n');

    const flowTable = (lowercaseTable: boolean): MdastRoot => ({
      type: 'root',
      children: [
        {
          type: 'table',
          align: [null],
          ...(lowercaseTable && { data: { lowercaseTable: true } }),
          children: [
            { type: 'tableRow', children: [{ type: 'tableCell', children: [{ type: 'text', value: 'H' }] }] },
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  // A code block has no single-line GFM form, so this table must serialize as JSX.
                  children: [{ type: 'code', value: 'x' } as unknown as TableCell['children'][number]],
                },
              ],
            },
          ],
        },
      ],
    });

    /** Runs the serializer transform in place and returns the same tree. */
    const toJsx = (tree: MdastRoot): MdastRoot => {
      mdxishTablesToJsx()(tree);
      return tree;
    };

    it('converts a stamped table with a flow-content cell into a lowercase table element', () => {
      const tree = parseMdxish(lowercaseTableWithCell(listCell));
      expect(collectNodes(tree, 'table')).toHaveLength(1);

      expect(toJsx(tree).children[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'table',
        attributes: [],
        children: [
          {
            name: 'thead',
            children: [{ name: 'tr', children: [{ name: 'th' }, { name: 'th' }] }],
          },
          {
            name: 'tbody',
            children: [
              {
                name: 'tr',
                children: [
                  { name: 'td', children: [{ type: 'text', value: 'Foo' }] },
                  { name: 'td', children: [{ type: 'mdxJsxFlowElement', name: 'ul' }] },
                ],
              },
            ],
          },
        ],
      });
    });

    it('converts a stamped phrasing-only table into a table element instead of leaving it GFM', () => {
      const tree = toJsx(parseMdxish(lowercaseTableWithCell('plain')));

      expect(collectNodes(tree, 'table')).toHaveLength(0);
      expect(tree.children[0]).toMatchObject({ type: 'mdxJsxFlowElement', name: 'table', attributes: [] });
    });

    it('keeps the Table element name when the stamp is absent', () => {
      expect(toJsx(flowTable(false)).children[0]).toMatchObject({ type: 'mdxJsxFlowElement', name: 'Table' });
      expect(toJsx(flowTable(true)).children[0]).toMatchObject({ type: 'mdxJsxFlowElement', name: 'table' });
    });

    it('keeps a <Table> source as a Table element', () => {
      const source = lowercaseTableWithCell(listCell, '<Table>').replace('</table>', '</Table>');

      expect(toJsx(parseMdxish(source)).children[0]).toMatchObject({ type: 'mdxJsxFlowElement', name: 'Table' });
    });

    it('leaves a stamped table with no rows untouched instead of throwing', () => {
      const tree: MdastRoot = {
        type: 'root',
        children: [{ type: 'table', align: [], data: { lowercaseTable: true }, children: [] }],
      };

      expect(() => toJsx(tree)).not.toThrow();
      expect(tree.children[0]).toStrictEqual({ type: 'table', align: [], data: { lowercaseTable: true }, children: [] });
    });
  });
});
