import { JSX_COMMENT_REGEX } from '../../../lib/micromark/jsx-comment/pattern';

/**
 * Removes JSX-style comments (e.g., { /* comment *\/ }) from content.
 *
 * @param content
 * @returns Content with JSX comments removed
 * @example
 * ```typescript
 * removeJSXComments('Text { /* comment *\/ } more text')
 * // Returns: 'Text  more text'
 * ```
 */
export function removeJSXComments(content: string): string {
  return content.replace(JSX_COMMENT_REGEX, '');
}
