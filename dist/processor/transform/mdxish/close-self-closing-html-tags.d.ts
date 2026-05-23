/**
 * String-level preprocessor that converts self-closing non-void HTML tags
 * into explicitly closed tags.
 *
 * Problem: `rehype-raw` (via parse5) follows the HTML spec where the `/` in
 * `<i />` is ignored for non-void elements. This causes `<i />` to be parsed
 * as an opening `<i>` tag, which then wraps all subsequent content.
 *
 * Solution: Transform `<i />` → `<i></i>` before parsing, so rehype-raw
 * sees a properly closed element.
 *
 * This preprocessor:
 * - Skips void elements (`<br />`, `<hr />`, `<img />`, etc.)
 * - Skips PascalCase tags (custom components handled elsewhere)
 * - Protects code blocks from transformation
 *
 * @example
 * closeSelfClosingHtmlTags('<i/> text')          // '<i></i> text'
 * closeSelfClosingHtmlTags('<br />')             // '<br />' (void, untouched)
 * closeSelfClosingHtmlTags('<MyComp />')         // '<MyComp />' (PascalCase, untouched)
 * closeSelfClosingHtmlTags('<i class="icon" />') // '<i class="icon"></i>'
 */
export declare function closeSelfClosingHtmlTags(content: string): string;
