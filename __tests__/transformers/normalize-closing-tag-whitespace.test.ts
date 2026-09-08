import { normalizeClosingTagWhitespace } from '../../processor/transform/mdxish/normalize-closing-tag-whitespace';

describe('normalizeClosingTagWhitespace (string-level preprocessor)', () => {
  describe('canonicalizes closing tags with stray whitespace', () => {
    it('strips inner spaces from </ td >', () => {
      expect(normalizeClosingTagWhitespace('Marshall Islands </ td >')).toBe('Marshall Islands </td>');
    });

    it('strips a trailing space from </table >', () => {
      expect(normalizeClosingTagWhitespace('</table >')).toBe('</table>');
    });

    it('strips a leading space from </ table>', () => {
      expect(normalizeClosingTagWhitespace('</ table>')).toBe('</table>');
    });

    it('collapses multiple spaces </  th  >', () => {
      expect(normalizeClosingTagWhitespace('</  th  >')).toBe('</th>');
    });

    it('handles tabs', () => {
      expect(normalizeClosingTagWhitespace('</\ttd\t>')).toBe('</td>');
    });

    it.each(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'ul', 'li', 'div', 'span'])(
      'normalizes </ %s >',
      tag => {
        expect(normalizeClosingTagWhitespace(`</ ${tag} >`)).toBe(`</${tag}>`);
      },
    );
  });

  describe('leaves canonical and non-tag input untouched', () => {
    it('leaves an already-canonical </td> unchanged', () => {
      expect(normalizeClosingTagWhitespace('</td>')).toBe('</td>');
    });

    it('leaves opening tags unchanged', () => {
      expect(normalizeClosingTagWhitespace('<td> content </td>')).toBe('<td> content </td>');
    });

    it('does not touch non-HTML tag names (custom components)', () => {
      expect(normalizeClosingTagWhitespace('</ MyComponent >')).toBe('</ MyComponent >');
    });

    it('does not touch prose that looks like a stray closer', () => {
      expect(normalizeClosingTagWhitespace('a </ b and c > d')).toBe('a </ b and c > d');
    });

    it('does not span newlines', () => {
      const input = 'x </\ntd\n> y';
      expect(normalizeClosingTagWhitespace(input)).toBe(input);
    });

    it('preserves the authored tag-name case', () => {
      expect(normalizeClosingTagWhitespace('</ TD >')).toBe('</TD>');
    });
  });

  describe('protects code', () => {
    it('leaves a spaced closer inside inline code alone', () => {
      expect(normalizeClosingTagWhitespace('use `</ td >` to close')).toBe('use `</ td >` to close');
    });

    it('leaves a spaced closer inside a fenced code block alone', () => {
      const input = '```html\n</ td >\n```';
      expect(normalizeClosingTagWhitespace(input)).toBe(input);
    });
  });

  describe('real-world table shapes', () => {
    it('normalizes both the cell closer and the table closer', () => {
      const input = ['<table>', '  <tr>', '    <td>Sri Lanka </ td >', '  </tr>', '</ table >'].join('\n');
      const expected = ['<table>', '  <tr>', '    <td>Sri Lanka </td>', '  </tr>', '</table>'].join('\n');
      expect(normalizeClosingTagWhitespace(input)).toBe(expected);
    });
  });
});
