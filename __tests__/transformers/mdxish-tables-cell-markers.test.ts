import { toHtml } from 'hast-util-to-html';

import { mdxish } from '../../lib/mdxish';
import { findAllElementsByTagName, roundTripMdxish } from '../helpers';

const tables = {
  table: (row: string) => `<table>\n<thead><tr><th>h</th></tr></thead>\n<tbody>\n${row}\n</tbody>\n</table>`,
  Table: (row: string) =>
    `<Table>\n  <thead>\n    <tr><th>h</th></tr>\n  </thead>\n  <tbody>\n    ${row}\n  </tbody>\n</Table>`,
};

/** Inner HTML of the first `<td>` rendered from a one-row table. */
const renderCell = (tag: keyof typeof tables, row: string) => {
  const [cell] = findAllElementsByTagName(mdxish(tables[tag](row)), 'td');
  return toHtml(cell.children);
};

// RM-16838: cell text on the opener's line is inline, as in mdx and legacy. Re-parsing it as
// its own document turned `- foo` into a list, `#` into a heading, and dropped one backslash.
describe.each(Object.keys(tables) as (keyof typeof tables)[])('mdxish <%s> cell block markers (RM-16838)', tag => {
  describe('given a block marker on the opener line', () => {
    it.each([
      '-',
      '*',
      '+',
      '- foo',
      '* foo',
      '+ foo',
      '#',
      '## heading',
      '---',
      '***',
      '___',
      '1.',
      '1. foo',
      '1) foo',
      '- [ ] task',
      '>',
      '> quote',
      '> 📘 Title',
    ])('renders "%s" as literal text', marker => {
      expect(renderCell(tag, `<tr><td>${marker}</td></tr>`)).toBe(marker);
    });

    it('renders literal text in a cell with attributes', () => {
      expect(renderCell(tag, '<tr><td colspan="1">- foo</td></tr>')).toBe('- foo');
    });

    it('renders a header cell marker as literal text', () => {
      const [th] = findAllElementsByTagName(mdxish(tables[tag]('<tr><td>x</td></tr>').replace('>h<', '>-<')), 'th');
      expect(toHtml(th.children)).toBe('-');
    });
  });

  describe('given a backslash-escaped marker', () => {
    it.each([
      ['\\- foo', '- foo'],
      ['\\#', '#'],
      ['\\## heading', '## heading'],
      ['\\*a\\*', '*a*'],
      ['\\_a\\_', '_a_'],
      ['  \\- foo', '  - foo'],
      [' \\# heading', ' # heading'],
    ])('honors a single backslash in "%s"', (source, expected) => {
      expect(renderCell(tag, `<tr><td>${source}</td></tr>`)).toBe(expected);
    });
  });

  describe('given entity-encoded markup', () => {
    it('decodes an encoded marker once', () => {
      expect(renderCell(tag, '<tr><td>&#45; foo</td></tr>')).toBe('- foo');
    });

    it('keeps encoded tags as text', () => {
      const [cell] = findAllElementsByTagName(mdxish(tables[tag]('<tr><td>&lt;b&gt;x&lt;/b&gt;</td></tr>')), 'td');
      expect(findAllElementsByTagName(cell, 'b')).toHaveLength(0);
      expect(toHtml(cell.children)).toBe('&#x3C;b>x&#x3C;/b>');
    });
  });

  describe('given inline markdown on the opener line', () => {
    it.each([
      ['*em*', '<em>em</em>'],
      ['_em_', '<em>em</em>'],
      ['**strong**', '<strong>strong</strong>'],
      ['__strong__', '<strong>strong</strong>'],
      ['`- code`', '<code>- code</code>'],
      ['- **bold**', '- <strong>bold</strong>'],
    ])('still parses "%s"', (source, expected) => {
      expect(renderCell(tag, `<tr><td>${source}</td></tr>`)).toBe(expected);
    });
  });

  describe('given cell content on its own lines', () => {
    it('parses a list item as a list', () => {
      expect(renderCell(tag, '<tr>\n<td>\n- foo\n</td>\n</tr>')).toBe('<ul>\n<li>foo</li>\n</ul>');
    });

    // Matches mdx: a lone `-` line is an empty CommonMark list item in flow content.
    it('parses a lone dash as an empty list item', () => {
      expect(renderCell(tag, '<tr>\n<td>\n-\n</td>\n</tr>')).toBe('<ul>\n<li></li>\n</ul>');
    });

    it('honors an escaped dash', () => {
      expect(renderCell(tag, '<tr>\n<td>\n\\- foo\n</td>\n</tr>')).toBe('- foo');
    });
  });
});

describe('mdxish table cell block markers round trip (RM-16838)', () => {
  it.each([
    '<table>\n<thead><tr><th>-</th></tr></thead>\n<tbody><tr><td>- foo</td></tr></tbody>\n</table>',
    '<table>\n<thead><tr><th>#</th></tr></thead>\n<tbody><tr><td>\\- foo</td></tr></tbody>\n</table>',
  ])('re-renders the serialized table with the same literal cells', doc => {
    const html = toHtml(mdxish(doc));
    expect(toHtml(mdxish(roundTripMdxish(doc)))).toBe(html);
  });
});
