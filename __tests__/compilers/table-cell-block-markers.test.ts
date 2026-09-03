import type { PhrasingContent, TableCell, Text } from 'mdast';
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

/**
 * Builds a one-column table in the exact layout the serializer emits (columns padded to the
 * widest cell, delimiter row stretched to match), so a round trip can be asserted as identity.
 */
const table = (cell: string, header = 'a') => {
  const width = Math.max(cell.length, header.length);

  return `| ${header.padEnd(width)} |\n| :${'-'.repeat(width - 1)} |\n| ${cell.padEnd(width)} |\n`;
};

describe('table cell block markers', () => {
  describe('round trips (RM-17203)', () => {
    it.each([
      ['a dash bullet', '\\- one'],
      ['a plus bullet', '\\+ one'],
      ['an ATX heading', '\\# one'],
      ['a block quote', '\\> quote'],
      ['a bare dash', '\\-'],
    ])('should keep %s escaped in a cell', (_, cell) => {
      expect(roundTrip(table(cell))).toBe(table(cell));
    });

    it('should keep an escaped marker in a header cell', () => {
      expect(roundTrip(table('x', '\\- h'))).toBe(table('x', '\\- h'));
    });

    it('should escape a leading marker the author left unescaped', () => {
      expect(roundTrip(table('- one'))).toBe(table('\\- one'));
    });

    it('should keep an escaped marker after a <br />', () => {
      const doc = '| a                  | b  |\n| :----------------- | :- |\n| \\- one<br />\\- two | x  |\n';

      expect(roundTrip(doc)).toBe(doc);
    });

    it('should not escape a marker in the middle of a cell', () => {
      expect(roundTrip(table('foo - bar'))).toBe(table('foo - bar'));
    });

    it('should not escape a dash that cannot open a list', () => {
      expect(roundTrip(table('-foo'))).toBe(table('-foo'));
    });

    it('should not escape an emphasized marker, which is no longer at the cell start', () => {
      expect(roundTrip(table('**- one**'))).toBe(table('**- one**'));
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
    const node: Text = { type: 'text', value: '' };
    const cell = (...children: PhrasingContent[]): TableCell => ({ type: 'tableCell', children });

    const escape = (serialized: string, state = inCell, info = cellStart) =>
      escapeCellStartBlockMarker(serialized, node, cell(node), state, info);

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

    it.each<[string, PhrasingContent]>([
      ['a break node', { type: 'break' }],
      ['a raw <br>', { type: 'html', value: '<br />' }],
      ['a JSX <br>', { type: 'mdxJsxTextElement', name: 'br', attributes: [], children: [] }],
    ])('should escape text following %s', (_, previous) => {
      expect(escapeCellStartBlockMarker('- two', node, cell(previous, node), inCell, midCell)).toBe('\\- two');
    });

    it('should not escape text following a non-break sibling', () => {
      const withCode = cell({ type: 'inlineCode', value: 'x' }, node);

      expect(escapeCellStartBlockMarker('- two', node, withCode, inCell, midCell)).toBe('- two');
    });
  });
});
