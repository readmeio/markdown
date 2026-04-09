import { normalizeCompactHeadings } from '../../processor/transform/mdxish/normalize-compact-headings';

describe('normalizeCompactHeadings', () => {
  describe('basic heading normalization', () => {
    it('should add space after # for compact h1', () => {
      expect(normalizeCompactHeadings('#Header')).toBe('# Header');
    });

    it('should add space after ## for compact h2', () => {
      expect(normalizeCompactHeadings('##Header')).toBe('## Header');
    });

    it('should add space after ### for compact h3', () => {
      expect(normalizeCompactHeadings('###Header')).toBe('### Header');
    });

    it('should handle all heading levels up to h6', () => {
      expect(normalizeCompactHeadings('######H6')).toBe('###### H6');
    });

    it('should not modify headings with existing space', () => {
      expect(normalizeCompactHeadings('# Header')).toBe('# Header');
      expect(normalizeCompactHeadings('## Header')).toBe('## Header');
      expect(normalizeCompactHeadings('### Header')).toBe('### Header');
    });

    it('should handle multiple headings', () => {
      const input = '#H1\nText\n##H2';
      const expected = '# H1\nText\n## H2';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });

    it('should handle mixed proper and compact headings', () => {
      const input = '# Proper\n\n##Compact\n\nParagraph text\n\n### Also Proper';
      const expected = '# Proper\n\n## Compact\n\nParagraph text\n\n### Also Proper';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });
  });

  describe('protected blocks (code blocks)', () => {
    it('should NOT modify # inside fenced code blocks with backticks', () => {
      const input = '#Heading\n\n```python\n#Comment\n```';
      const expected = '# Heading\n\n```python\n#Comment\n```';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });

    it('should NOT modify ## inside code blocks', () => {
      const input = '```\n##Not a heading\n###Also not\n```';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should handle code blocks with language specifier', () => {
      const input = '#H1\n```javascript\n#NotHeading\n```\n##H2';
      const expected = '# H1\n```javascript\n#NotHeading\n```\n## H2';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });

    it('should handle multiple code blocks', () => {
      const input = '#H1\n```\n#Code1\n```\n##H2\n```\n#Code2\n```\n###H3';
      const expected = '# H1\n```\n#Code1\n```\n## H2\n```\n#Code2\n```\n### H3';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });

    it('should NOT modify indented code blocks (4 spaces)', () => {
      const input = '#Heading\n\n    #IndentedCode';
      const expected = '# Heading\n\n    #IndentedCode';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });

    it('should NOT modify tab-indented code blocks', () => {
      const input = '#Heading\n\n\t#TabIndentedCode';
      const expected = '# Heading\n\n\t#TabIndentedCode';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });
  });

  describe('text before hashtag (Dimas feedback)', () => {
    it('should NOT modify mid-line # (text before hashtag)', () => {
      const input = 'Some text #hashtag on same line';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should NOT modify # in middle of paragraph', () => {
      const input = 'Use #tags and ##double tags in text';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should NOT modify # after punctuation on same line', () => {
      const input = 'Hello! #hashtag';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should NOT modify inline # with numbers', () => {
      const input = 'Issue #123 is fixed';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should NOT modify # in URLs', () => {
      const input = 'Visit https://example.com#section for more';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should handle heading after line with mid-line #', () => {
      const input = 'Check issue #42\n#ActualHeading';
      const expected = 'Check issue #42\n# ActualHeading';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });
  });

  describe('escaped hashtag (Dimas feedback)', () => {
    it('should NOT modify escaped \\# at start of line', () => {
      const input = '\\#NotAHeading';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should NOT modify escaped \\## at start of line', () => {
      const input = '\\##NotAHeading';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should handle escaped # followed by real heading', () => {
      const input = '\\#Escaped\n\n#RealHeading';
      const expected = '\\#Escaped\n\n# RealHeading';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });

    it('should handle multiple escaped # lines', () => {
      const input = '\\#First\n\\#Second\n#ActualHeading';
      const expected = '\\#First\n\\#Second\n# ActualHeading';
      expect(normalizeCompactHeadings(input)).toBe(expected);
    });

    it('should NOT modify backslash-escaped # mid-line', () => {
      const input = 'Use \\#escaped in text';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });
  });

  describe('other edge cases', () => {
    it('should NOT modify more than 6 # symbols', () => {
      const input = '#######NotAHeading';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should handle empty content', () => {
      expect(normalizeCompactHeadings('')).toBe('');
    });

    it('should handle content with no headings', () => {
      const input = 'Just some text\nwith multiple lines\nand no headings';
      expect(normalizeCompactHeadings(input)).toBe(input);
    });

    it('should handle # followed by another #', () => {
      expect(normalizeCompactHeadings('## Header')).toBe('## Header');
    });

    it('should handle empty headings', () => {
      expect(normalizeCompactHeadings('#')).toBe('#');
      expect(normalizeCompactHeadings('# ')).toBe('# ');
    });
  });
});
