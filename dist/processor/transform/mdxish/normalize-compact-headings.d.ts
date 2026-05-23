/**
 * Preprocessor to normalize compact headings.
 *
 * CommonMark requires whitespace after # for headings, but users often omit it.
 * This preprocessor adds the space while being careful not to modify:
 * - Content inside fenced code blocks (protected via protectCodeBlocks)
 * - Escaped hashtags (\#)
 * - Mid-line hashtags (text #hashtag)
 *
 * Examples:
 * - `#Header` → `# Header`
 * - `##Title` → `## Title`
 * - `######H6` → `###### H6`
 */
export declare function normalizeCompactHeadings(content: string): string;
