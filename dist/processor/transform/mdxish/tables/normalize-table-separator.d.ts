/**
 * Preprocessor to normalize malformed GFM table separator syntax.
 *
 * Fixes the common mistake where the alignment colon is placed after the pipe
 * instead of before the dashes:
 *
 * Invalid: `|: ---` or `|:---` (colon after pipe)
 * Valid:   `| :---` (colon before dashes)
 *
 * Also handles right alignment:
 * Invalid: `| ---:| ` with space before pipe
 * Valid:   `| ---:|` (no space before closing pipe)
 *
 * This runs before remark-parse to ensure the table is recognized as a valid GFM table.
 */
/**
 * Preprocesses markdown content to normalize malformed table separator syntax.
 *
 * @param content - The raw markdown content
 * @returns The content with normalized table separators
 */
export declare function normalizeTableSeparator(content: string): string;
export default normalizeTableSeparator;
