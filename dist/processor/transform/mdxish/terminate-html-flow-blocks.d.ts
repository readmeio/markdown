/**
 * Preprocessor to terminate HTML flow blocks.
 *
 * In CommonMark, HTML blocks (types 6 and 7) only terminate on a blank line.
 * Without one, any content on the next line is consumed as part of the HTML block
 * and never parsed as its own construct. For example, a `[block:callout]` immediately
 * following `<div><p></p></div>` gets swallowed into the HTML flow token.
 *
 * @link https://spec.commonmark.org/0.29/#html-blocks
 *
 * This preprocessor inserts a blank line after standalone HTML lines when the next
 * line is non-blank and not an HTML construct, ensuring micromark's HTML flow
 * tokenizer terminates and subsequent content is parsed independently.
 *
 * Conditions:
 * 1. Only non-indented lines with lowercase tag names are considered. Uppercase tags
 *    (e.g. `<Table>`, `<MyComponent>`) are JSX custom components and don't trigger
 *    CommonMark HTML blocks.
 * 2. Lines inside protected blocks (e.g. fenced code) are left untouched.
 * 3. Lines with an unclosed RAW_CONTENT_TAGS opener are exempted.
 */
export declare function terminateHtmlFlowBlocks(content: string): string;
