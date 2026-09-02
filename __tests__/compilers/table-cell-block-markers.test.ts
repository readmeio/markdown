import type { Parents, Text } from 'mdast';
import type { Info, State } from 'mdast-util-to-markdown';

import { mdast, mdx } from '../../index';
import { escapeCellStartBlockMarker } from '../../processor/compile/table-cell-block-markers';
import { roundTripMdxish } from '../helpers';

const roundTripMdx = (doc: string) => mdx(mdast(doc));

const roundTrip = (doc: string) => {
  const mdxishResult = roundTripMdxish(doc);
  expect(roundTripMdx(doc)).toBe(mdxishResult);

  return mdxishResult;
};

const table = (cell: string, header = 'a') => `| ${header} |\n| :- |\n| ${cell} |\n`;

describe('table cell block markers', () => {
  describe('round trips (RM-17203)', () => {
    it.each([
      ['a dash bullet', '\\- one'],
      ['a plus bullet', '\\+ one'],
      ['an ATX heading', '\\# one'],
      ['a block quote', '\\> quote'],
      ['a bare dash', '\\-'],
    ])('should keep %s escaped in a cell', (_, cell) => {
      expect(roundTrip(table(cell))).toContain(`| ${cell} |`);
    });

    it('should keep an escaped marker in a header cell', () => {
      expect(roundTrip('| \\- h |\n| :- |\n| x |\n')).toContain('| \\- h |');
    });

    it('should escape a leading marker the author left unescaped', () => {
      expect(roundTrip(table('- one'))).toContain('| \\- one |');
    });

    it('should keep an escaped marker after a <br />', () => {
      expect(roundTrip('| a | b |\n| :- | :- |\n| \\- one<br />\\- two | x |\n')).toContain('| \\- one<br />\\- two |');
    });

    it('should be stable across a second round trip', () => {
      const once = roundTrip(table('\\- one'));

      expect(roundTrip(once)).toBe(once);
    });

    it('should not escape a marker in the middle of a cell', () => {
      expect(roundTrip(table('foo - bar'))).toContain('| foo - bar |');
    });

    it('should not escape a dash that cannot open a list', () => {
      expect(roundTrip(table('-foo'))).toContain('| -foo |');
    });

    it('should not escape an emphasized marker, which is no longer at the cell start', () => {
      expect(roundTrip(table('**- one**'))).toContain('| **- one** |');
    });

    it('should leave an escaped marker outside a table alone', () => {
      expect(roundTrip('\\- not a list\n')).toBe('\\- not a list\n');
    });

    it('should leave a real list alone', () => {
      expect(roundTripMdxish('- one\n- two\n')).toBe('- one\n- two\n');
    });
  });

  describe('escapeCellStartBlockMarker', () => {
    const inCell = { stack: ['table', 'tableRow', 'tableCell', 'phrasing'] } as State;
    const inParagraph = { stack: ['paragraph', 'phrasing'] } as State;
    const cellStart = { before: '|', after: '|' } as Info;
    const midCell = { before: 'x', after: '|' } as Info;
    const node = { type: 'text', value: '' } satisfies Text;
    const parent = { type: 'tableCell', children: [node] } as unknown as Parents;

    const escape = (serialized: string, state = inCell, info = cellStart) =>
      escapeCellStartBlockMarker(serialized, node, parent, state, info);

    it.each(['- one', '+ one', '# one', '###### one', '> quote', '-', '#'])('should escape `%s`', serialized => {
      expect(escape(serialized)).toBe(`\\${serialized}`);
    });

    it.each(['-foo', '#foo', 'foo - bar', '* one', '1. one', ''])('should not escape `%s`', serialized => {
      expect(escape(serialized)).toBe(serialized);
    });

    it('should not double-escape an already escaped marker', () => {
      expect(escape('\\- one')).toBe('\\- one');
    });

    it('should not escape outside a table cell', () => {
      expect(escape('- one', inParagraph)).toBe('- one');
    });

    it('should not escape away from the cell start', () => {
      expect(escape('- one', inCell, midCell)).toBe('- one');
    });

    it.each([
      ['a break node', { type: 'break' }],
      ['a raw <br>', { type: 'html', value: '<br />' }],
      ['a JSX <br>', { type: 'mdxJsxTextElement', name: 'br', children: [] }],
    ])('should escape text following %s', (_, previous) => {
      const withBreak = { type: 'tableCell', children: [previous, node] } as unknown as Parents;

      expect(escapeCellStartBlockMarker('- two', node, withBreak, inCell, midCell)).toBe('\\- two');
    });

    it('should not escape text following a non-break sibling', () => {
      const withCode = {
        type: 'tableCell',
        children: [{ type: 'inlineCode', value: 'x' }, node],
      } as unknown as Parents;

      expect(escapeCellStartBlockMarker('- two', node, withCode, inCell, midCell)).toBe('- two');
    });
  });
});
