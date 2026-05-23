export declare function base64Decode(str: string): string;
export declare const HTML_BLOCK_CONTENT_START = "<!--RDMX_HTMLBLOCK:";
export declare const HTML_BLOCK_CONTENT_END = ":RDMX_HTMLBLOCK-->";
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
export declare function removeJSXComments(content: string): string;
/**
 * Preprocesses JSX-like markdown content before parsing.
 *
 * JSX attribute expressions (`href={baseUrl}`) are no longer rewritten here —
 * they flow through the tokenizer as `mdxJsxAttributeValueExpression` nodes
 * and are evaluated at the hast handler step.
 *
 * @param content
 * @returns Preprocessed content ready for markdown parsing
 */
export declare function preprocessJSXExpressions(content: string): string;
