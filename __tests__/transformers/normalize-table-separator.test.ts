import { normalizeTableSeparator } from '../../processor/transform/mdxish/normalize-table-separator';

describe('normalize-table-separator', () => {
  describe('malformed left alignment', () => {
    it('fixes colon after pipe with space before dashes: |: --- → | :---', () => {
      const input = `| Header1 | Header2 |
|: --- |: --- |
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| :--- | :--- |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('fixes colon directly after pipe: |:--- → | :---', () => {
      const input = `| Header1 | Header2 |
|:---|:---|
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| :---| :---|
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('fixes mixed valid and malformed separators in same row', () => {
      const input = `| Header1 | Header2 |
| :--- |: ---- |
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| :--- | :---- |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles very long separator dashes', () => {
      const input = `| **File Name** | **Description** |
| :------------------ |: ------------------------------------------------------------ |
| file.css | Description here |`;

      const expected = `| **File Name** | **Description** |
| :------------------ | :------------------------------------------------------------ |
| file.css | Description here |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });
  });

  describe('malformed double colon', () => {
    it('fixes double colon directly after pipe: |::--- → | :---', () => {
      const input = `| Header1 | Header2 |
|::---|::---|
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| :---| :---|
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('fixes double colon with space after pipe: | ::--- → | :---', () => {
      const input = `| Header1 | Header2 | Header3 |
| :--- | ::--- | ::--- |
| cell1 | cell2 | cell3 |`;

      const expected = `| Header1 | Header2 | Header3 |
| :--- | :--- | :--- |
| cell1 | cell2 | cell3 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('fixes double colon with space before dashes: |:: --- → | :---', () => {
      const input = `| Header1 | Header2 |
|:: --- |:: --- |
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| :--- | :--- |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });
  });

  describe('malformed right alignment', () => {
    it('fixes space before right-alignment colon: | --- : | → | ---: |', () => {
      const input = `| Header1 | Header2 |
| --- : | --- : |
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| ---: | ---: |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('fixes multiple spaces before right-alignment colon', () => {
      const input = `| Header1 | Header2 |
| ---   : | ---  : |
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| ---: | ---: |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });
  });

  describe('malformed center alignment', () => {
    it('fixes spaces around center-aligned dashes: | : --- : | → | :---: |', () => {
      const input = `| Header1 | Header2 |
|: --- :|: --- :|
| cell1 | cell2 |`;

      const expected = `| Header1 | Header2 |
| :---:| :---:|
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });
  });

  describe('valid separators (no changes)', () => {
    it('preserves valid left-aligned separators', () => {
      const input = `| Header1 | Header2 |
| :--- | :--- |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('preserves valid right-aligned separators', () => {
      const input = `| Header1 | Header2 |
| ---: | ---: |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('preserves valid center-aligned separators', () => {
      const input = `| Header1 | Header2 |
| :---: | :---: |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('preserves valid unaligned separators', () => {
      const input = `| Header1 | Header2 |
| --- | --- |
| cell1 | cell2 |`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('preserves mixed valid alignments in same row', () => {
      const input = `| Left | Center | Right | None |
| :--- | :---: | ---: | --- |
| a | b | c | d |`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });
  });

  describe('non-table content (no changes)', () => {
    it('ignores regular text with colons', () => {
      const input = `This is a paragraph with: some text.
And another line: with colons.`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('ignores inline code containing table syntax', () => {
      const input = 'Use the syntax `|: ---` for tables';
      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('ignores empty content', () => {
      expect(normalizeTableSeparator('')).toBe('');
    });

    it('ignores content with no tables', () => {
      const input = `# Heading

Some paragraph text.

- List item 1
- List item 2`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    // Note: Code blocks are modified because preprocessing runs before markdown parsing
    it('modifies code blocks (preprocessing cannot distinguish them)', () => {
      const input = `\`\`\`
| Header |
|: --- |
\`\`\``;

      const expected = `\`\`\`
| Header |
| :--- |
\`\`\``;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });
  });

  describe('multiple tables and positions', () => {
    it('handles multiple tables in content', () => {
      const input = `| Table1 | Col2 |
|: --- |: --- |
| a | b |

Some text between tables.

| Table2 | Col2 |
|: --- |: --- |
| c | d |`;

      const expected = `| Table1 | Col2 |
| :--- | :--- |
| a | b |

Some text between tables.

| Table2 | Col2 |
| :--- | :--- |
| c | d |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles table at start of document', () => {
      const input = `| Header |
|: --- |
| cell |`;

      const expected = `| Header |
| :--- |
| cell |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles table at end of document', () => {
      const input = `Some intro text.

| Header |
|: --- |
| cell |`;

      const expected = `Some intro text.

| Header |
| :--- |
| cell |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles single column table', () => {
      const input = `| Header |
|: --- |
| cell |`;

      const expected = `| Header |
| :--- |
| cell |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles many columns', () => {
      const input = `| A | B | C | D | E |
|: ---|: ---|: ---|: ---|: ---|
| 1 | 2 | 3 | 4 | 5 |`;

      const expected = `| A | B | C | D | E |
| :---| :---| :---| :---| :---|
| 1 | 2 | 3 | 4 | 5 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });
  });

  describe('extreme edge cases', () => {
    it('handles minimal single-dash separator', () => {
      const input = `| H |
|: - |
| c |`;

      const expected = `| H |
| :- |
| c |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles separator without closing pipe', () => {
      const input = `| Header1 | Header2
|: ---|: ---
| cell1 | cell2`;

      const expected = `| Header1 | Header2
| :---| :---
| cell1 | cell2`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles all alignment types malformed in one row', () => {
      const input = `| Left | Center | Right | None |
|: ---|: --- :|--- : |--- |
| a | b | c | d |`;

      const expected = `| Left | Center | Right | None |
| :---| :---:|---: |--- |
| a | b | c | d |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles adjacent tables with no blank line (both get fixed)', () => {
      const input = `| T1 |
|: ---|
| a |
| T2 |
|: ---|
| b |`;

      const expected = `| T1 |
| :---|
| a |
| T2 |
| :---|
| b |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles table with only header and separator (no data rows)', () => {
      const input = `| Header1 | Header2 |
|: ---|: ---|`;

      const expected = `| Header1 | Header2 |
| :---| :---|`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles separator-like content in data cells (should not modify)', () => {
      const input = `| Pattern | Description |
| :--- | :--- |
| |: --- | This shows malformed syntax |
| |::--- | Double colon example |`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('handles extremely wide table (20+ columns)', () => {
      const input = `| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T |
|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|: ---|
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |`;

      const expected = `| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T |
| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---| :---|
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles tabs in separator (treated as whitespace)', () => {
      const input = '| Header1 | Header2 |\n|:\t---|:\t---|\n| cell1 | cell2 |';

      const expected = '| Header1 | Header2 |\n| :---| :---|\n| cell1 | cell2 |';

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles malformed separator immediately after frontmatter', () => {
      const input = `---
title: Test
---
| Header |
|: ---|
| cell |`;

      const expected = `---
title: Test
---
| Header |
| :---|
| cell |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('handles windows line endings (CRLF)', () => {
      const input = '| Header1 | Header2 |\r\n|: ---|: ---|\r\n| cell1 | cell2 |';

      const expected = '| Header1 | Header2 |\r\n| :---| :---|\r\n| cell1 | cell2 |';

      expect(normalizeTableSeparator(input)).toBe(expected);
    });

    it('does not fix separator with empty cell (extra pipes)', () => {
      // Extra pipes create empty cells which break the separator line regex
      const input = `| Header1 | Header2 ||
|: ---|: ---||
| cell1 | cell2 ||`;

      // The TABLE_SEPARATOR_LINE_REGEX doesn't match this, so no changes
      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('does not modify separator with colons inside dashes: |--:--|', () => {
      // This is invalid GFM but we shouldn't break it further
      const input = `| Header |
| --:-- |
| cell |`;

      expect(normalizeTableSeparator(input)).toBe(input);
    });

    it('handles unicode in header but malformed separator', () => {
      const input = `| 名前 | 説明 | Émoji 🎉 |
|: ---|: ---|: ---|
| データ | テスト | ✓ |`;

      const expected = `| 名前 | 説明 | Émoji 🎉 |
| :---| :---| :---|
| データ | テスト | ✓ |`;

      expect(normalizeTableSeparator(input)).toBe(expected);
    });
  });
});
