import type { Parent, Root } from 'mdast';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import mdxishTablesToJsx from '../../processor/transform/mdxish/tables/mdxish-tables-to-jsx';
import { collectNodes, roundTripMdxish } from '../helpers';

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
      const tables = jsxElements.filter((n) => (n as { name?: string }).name === 'Table');

      expect(tables).toHaveLength(1);
      expect(collectNodes(tree, 'table')).toHaveLength(0);
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
      const tree = parseWithPlugin(
        '| H1 | H2 |\n| --- | --- |\n| <Image src="a.png" /> | text |',
      );
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name: string })[];
      const names = jsxElements.map((n) => n.name);

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
      const tableNode = jsxElements.find((n) => n.name === 'Table');

      expect(tableNode).toBeDefined();
      const alignAttr = tableNode!.attributes.find((a) => a.name === 'align');
      expect(alignAttr).toBeDefined();
      expect(JSON.parse(alignAttr!.value.value)).toStrictEqual(['left', 'center', 'right']);
    });

    it('omits the align attribute when all columns are left-aligned', () => {
      const tree = parseWithPlugin(
        '| A | B |\n| --- | --- |\n| <Image src="a.png" /> | x |',
      );
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & {
        attributes: { name: string }[];
        name: string;
      })[];
      const tableNode = jsxElements.find((n) => n.name === 'Table');

      expect(tableNode).toBeDefined();
      expect(tableNode!.attributes).toHaveLength(0);
    });
  });

  describe('multi-child cell scanning', () => {
    it('detects flow content in any child of a cell, not just the first', () => {
      const md = '| Header |\n| --- |\n| text <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name?: string })[];
      const tableNode = jsxElements.find((n) => n.name === 'Table');

      expect(tableNode).toBeDefined();
    });

    it('keeps GFM when all children are phrasing content', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| hello **world** |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });
  });
});
