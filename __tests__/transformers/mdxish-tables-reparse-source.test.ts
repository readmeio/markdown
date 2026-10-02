import type { Node } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { collectNodes, parseMdxishWithResolvedSources } from '../helpers';

const isTableRoot = (node: Node): boolean =>
  node.type === 'table' ||
  (node.type === 'mdxJsxFlowElement' && ['Table', 'table'].includes((node as MdxJsxFlowElement).name ?? ''));

const labelOf = (node: Node): string => ('name' in node && typeof node.name === 'string' ? node.name : node.type);

/**
 * Every node under the first table, as `[label, slice]` pairs, resolving each node's
 * source the way a consumer must (nearest `data.reparseSource`, else the document).
 */
const tableSlices = (md: string, newEditorTypes = true): [string, string | undefined][] => {
  const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes });
  const [table] = collectNodes(tree, isTableRoot);
  const slices: [string, string | undefined][] = [];
  visit(table, node => {
    slices.push([labelOf(node), sliceOf(node)]);
  });
  return slices;
};

const indent = (lines: string[], by = '  ') => lines.map(line => (line ? `${by}${line}` : line));

const wrapIn = (opener: string, closer: string, lines: string[], by = '  ') =>
  ['Hello world', '', opener, ...indent(lines, by), closer].join('\n');

// CX-4004: a table nested in a component body is re-parsed from that body, so its offsets
// index into the body. The replacement table dropped the body's `reparseSource` stamp, so
// consumers sliced the whole document and corrupted cells (e.g. `{bucket}` → 8 random chars).
describe('mdxish table positions resolve against their re-parse source (CX-4004)', () => {
  const headedTable = [
    '<Table>',
    '  <thead>',
    '    <tr>',
    '      <th>{bucket}</th>',
    '    </tr>',
    '  </thead>',
    '</Table>',
  ];
  const headedTableSlices: [string, string][] = [
    ['table', headedTable.join('\n')],
    ['tableRow', ['<tr>', '      <th>{bucket}</th>', '    </tr>'].join('\n')],
    ['tableCell', '<th>{bucket}</th>'],
    ['mdxFlowExpression', '{bucket}'],
  ];

  describe('given a <Table> with a <thead> (markdown table path)', () => {
    it.each([
      ['Accordion', '<Accordion title="A">', '</Accordion>'],
      ['Callout', '<Callout icon="📘" theme="info">', '</Callout>'],
      ['Card', '<Card title="A">', '</Card>'],
    ])('resolves every node inside a <%s>', (_, opener, closer) => {
      expect(tableSlices(wrapIn(opener, closer, headedTable))).toStrictEqual(headedTableSlices);
    });

    it('resolves every node inside <Tabs><Tab>', () => {
      const md = wrapIn('<Tabs>', '</Tabs>', ['<Tab title="One">', ...indent(headedTable), '</Tab>']);
      expect(tableSlices(md)).toStrictEqual(headedTableSlices);
    });

    it('resolves the renderer path (no newEditorTypes) the same way', () => {
      expect(tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', headedTable), false)).toStrictEqual(
        headedTableSlices,
      );
    });

    it('resolves a table indented 4+ columns (dedented body)', () => {
      const md = wrapIn('<Accordion title="A">', '</Accordion>', headedTable, '    ');
      expect(tableSlices(md)).toStrictEqual(headedTableSlices);
    });

    it('resolves a table surrounded by blank lines and prose inside the body', () => {
      const md = wrapIn('<Accordion title="A">', '</Accordion>', [
        '',
        'Intro **text**',
        '',
        ...headedTable,
        '',
        'Outro',
        '',
      ]);
      expect(tableSlices(md)).toStrictEqual(headedTableSlices);
    });

    it('resolves a table with blank lines between its sections', () => {
      const table = ['<Table>', '  <thead>', '    <tr>', '      <th>{bucket}</th>', '    </tr>', '  </thead>', '', '  <tbody>', '    <tr>', '      <td><code>{region}</code></td>', '    </tr>', '  </tbody>', '</Table>']; // prettier-ignore
      const slices = tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', table));

      expect(slices).toStrictEqual([
        ['table', table.join('\n')],
        ['tableRow', ['<tr>', '      <th>{bucket}</th>', '    </tr>'].join('\n')],
        ['tableCell', '<th>{bucket}</th>'],
        ['mdxFlowExpression', '{bucket}'],
        ['tableRow', ['<tr>', '      <td><code>{region}</code></td>', '    </tr>'].join('\n')],
        ['tableCell', '<td><code>{region}</code></td>'],
        ['code', '<code>{region}</code>'],
        ['mdxFlowExpression', '{region}'],
      ]);
    });

    it('resolves a condensed single-line table', () => {
      const table = '<Table><thead><tr><th>{bucket}</th></tr></thead></Table>';
      const slices = tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', [table]));

      expect(slices).toStrictEqual([
        ['table', table],
        ['tableRow', '<tr><th>{bucket}</th></tr>'],
        ['tableCell', '<th>{bucket}</th>'],
        ['mdxFlowExpression', '{bucket}'],
      ]);
    });

    it('resolves a multi-line cell holding a list', () => {
      const table = ['<Table>', '  <thead>', '    <tr>', '      <th>', '', '        - {bucket}', '', '      </th>', '    </tr>', '  </thead>', '</Table>']; // prettier-ignore
      expect(tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', table))).toStrictEqual([
        ['table', table.join('\n')],
        ['tableRow', ['<tr>', '      <th>', '', '        - {bucket}', '', '      </th>', '    </tr>'].join('\n')],
        ['tableCell', ['<th>', '', '        - {bucket}', '', '      </th>'].join('\n')],
        ['list', '- {bucket}'],
        ['listItem', '- {bucket}'],
        ['mdxFlowExpression', '{bucket}'],
      ]);
    });
  });

  describe('given a <Table> kept as JSX', () => {
    it('resolves a header-less table inside a <Callout>', () => {
      const table = ['<Table>', '  <tr>', '    <td>{bucket}</td>', '  </tr>', '</Table>'];
      expect(tableSlices(wrapIn('<Callout icon="📘" theme="info">', '</Callout>', table))).toStrictEqual([
        ['Table', table.join('\n')],
        ['tr', ['<tr>', '    <td>{bucket}</td>', '  </tr>'].join('\n')],
        ['td', '<td>{bucket}</td>'],
        ['mdxFlowExpression', '{bucket}'],
      ]);
    });

    // Structural attributes keep it JSX in `mdxishTables`; the editor path then converts it
    // in `mdxishJsxToMdast`, so that replacement must carry the stamp too.
    it.each([
      ['renderer', false, 'Table'],
      ['editor', true, 'table'],
    ])('resolves a table with structural attributes (%s path)', (_, newEditorTypes, rootLabel) => {
      const table = ['<Table>', '  <thead>', '    <tr>', '      <th style={{ width: "30%" }}>{bucket}</th>', '    </tr>', '  </thead>', '</Table>']; // prettier-ignore
      const slices = tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', table), newEditorTypes);

      expect(slices[0]).toStrictEqual([rootLabel, table.join('\n')]);
      expect(slices.slice(-2)).toStrictEqual([
        [newEditorTypes ? 'tableCell' : 'th', '<th style={{ width: "30%" }}>{bucket}</th>'],
        ['mdxFlowExpression', '{bucket}'],
      ]);
    });
  });

  describe('given a lowercase <table>', () => {
    it('resolves every node inside a component', () => {
      const table = [
        '<table>',
        '  <thead>',
        '    <tr>',
        '      <th>a **b**</th>',
        '    </tr>',
        '  </thead>',
        '</table>',
      ];
      expect(tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', table))).toStrictEqual([
        ['table', table.join('\n')],
        ['tableRow', ['<tr>', '      <th>a **b**</th>', '    </tr>'].join('\n')],
        ['tableCell', '<th>a **b**</th>'],
        ['text', 'a '],
        ['strong', '**b**'],
        ['text', 'b'],
      ]);
    });

    // `splitHtmlWithNestedTables` lifts the table out of the `<div>` html node first.
    it('resolves a table lifted out of a raw HTML wrapper inside a component', () => {
      const table = [
        '<table>',
        '  <thead>',
        '    <tr>',
        '      <th>{bucket}</th>',
        '    </tr>',
        '  </thead>',
        '</table>',
      ];
      const md = wrapIn('<Accordion title="A">', '</Accordion>', ['<div>', ...table, '</div>']);
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      expect(collectNodes(tree, 'html').map(sliceOf)).toStrictEqual(['<div>\n', '\n</div>']);
      expect(tableSlices(md)).toStrictEqual([
        ['table', table.join('\n')],
        ['tableRow', ['<tr>', '      <th>{bucket}</th>', '    </tr>'].join('\n')],
        ['tableCell', '<th>{bucket}</th>'],
        ['mdxFlowExpression', '{bucket}'],
      ]);
    });
  });

  it('resolves a table recovered through the repair re-parse', () => {
    const table = ['<Table>', '  <thead>', '    <tr>', '      <th>a <b>bold</th>', '      <th>{bucket}</th>', '    </tr>', '  </thead>', '</Table>']; // prettier-ignore
    const slices = tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', table));

    expect(slices).toStrictEqual([
      ['table', table.join('\n')],
      ['tableRow', ['<tr>', '      <th>a <b>bold</th>', '      <th>{bucket}</th>', '    </tr>'].join('\n')],
      ['tableCell', '<th>a <b>bold</th>'],
      ['text', 'a '],
      ['b', '<b>bold'],
      ['text', 'bold'],
      ['tableCell', '<th>{bucket}</th>'],
      ['mdxFlowExpression', '{bucket}'],
    ]);
  });

  describe('given a top-level table (no component body)', () => {
    it('resolves every node against the document', () => {
      const md = ['Hello world', '', ...headedTable].join('\n');
      const { tree } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      expect(collectNodes(tree, isTableRoot)[0].data?.reparseSource).toBeUndefined();
      expect(tableSlices(md)).toStrictEqual(headedTableSlices);
    });

    // The no-mdxjs fallback splices the table's fragments in place of the html node.
    it('resolves every fragment spliced in by the fallback parse', () => {
      const md = ['<table>', '<tbody>', '<tr>', '<td>', '', 'a { b', '', '**bold**', '', '</td>', '</tr>', '</tbody>', '</table>'].join('\n'); // prettier-ignore
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      expect(tree.children.map(child => [child.type, sliceOf(child)])).toStrictEqual([
        ['html', '<table>\n<tbody>\n<tr>\n<td>'],
        ['paragraph', 'a { b'],
        ['paragraph', '**bold**'],
        ['html', '</td>\n</tr>\n</tbody>\n</table>'],
      ]);
    });
  });

  // A text-only cell is re-parsed from its extracted text, so its positions index into that
  // text rather than the table source; this held for top-level tables too.
  describe('given a text-only cell re-parsed as markdown', () => {
    const plainTable = ['<Table>', '  <thead>', '    <tr>', '      <th>plain</th>', '      <th>\\*a\\*</th>', '    </tr>', '  </thead>', '</Table>']; // prettier-ignore
    const plainCellSlices: [string, string][] = [
      ['tableCell', '<th>plain</th>'],
      ['text', 'plain'],
      ['tableCell', '<th>\\*a\\*</th>'],
      ['emphasis', '*a*'],
      ['text', 'a'],
    ];

    it('resolves its children against the extracted text at the top level', () => {
      expect(tableSlices(plainTable.join('\n')).slice(2)).toStrictEqual(plainCellSlices);
    });

    it('resolves its children against the extracted text inside a component', () => {
      expect(tableSlices(wrapIn('<Accordion title="A">', '</Accordion>', plainTable)).slice(2)).toStrictEqual(
        plainCellSlices,
      );
    });

    it('resolves its children in a header-less table kept as JSX', () => {
      const table = ['<Table>', '  <tr>', '    <td>plain</td>', '  </tr>', '</Table>'];
      expect(tableSlices(wrapIn('<Callout icon="📘" theme="info">', '</Callout>', table)).slice(2)).toStrictEqual([
        ['td', '<td>plain</td>'],
        ['text', 'plain'],
      ]);
    });
  });
});
