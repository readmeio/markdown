import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

/**
 * Preprocessor to normalize compact ATX headings.
 *
 * CommonMark requires whitespace after # for ATX headings, but users often omit it.
 * This preprocessor adds the space while being careful not to modify:
 * - Content inside fenced code blocks (protected via protectCodeBlocks)
 * - Escaped hashtags (\#)
 * - Mid-line hashtags (text #hashtag)
 * - Indented code blocks (4 spaces or tab)
 *
 * Examples:
 * - `#Header` → `# Header`
 * - `##Title` → `## Title`
 * - `######H6` → `###### H6`
 */
export function normalizeCompactHeadings(content: string): string {
  // Protect code blocks from modification
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const normalizedLines = protectedContent.split('\n').map(line => {

    // Skip escaped hashtags
    if (line.startsWith('\\#')) {
      return line;
    }

    // Match compact heading: start of line, 1-6 #, followed by non-space/non-# character
    const headingMatch = line.match(/^(#{1,6})([^\s#])/);
    if (headingMatch) {
      // Insert space after hashtags: "##Header" → "## Header"
      return `${headingMatch[1]} ${line.slice(headingMatch[1].length)}`;
    }

    return line;
  });

  // Restore protected code blocks
  return restoreCodeBlocks(normalizedLines.join('\n'), protectedCode);
}
