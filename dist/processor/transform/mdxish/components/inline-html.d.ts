import type { Root } from 'mdast';
import type { Plugin } from 'unified';
/**
 * Transform inline html nodes with expression attributes
 * inside paragraphs into `mdxJsxTextElement`s.
 *
 * Runs after `mdxishComponentBlocks`, which skips paragraph-parented html
 * nodes and leaves them for this pass. Two producers put html nodes inside
 * paragraphs:
 *   1. The `mdxComponent` text tokenizer, for lowercase tags with `{…}`
 *      attribute expressions (e.g. `<a href={url}>here</a>`).
 *   2. CommonMark's built-in html-text tokenizer, for PascalCase components
 *      (e.g. a single html node for self-closing `<C />`).
 *
 * Eligibility mirrors `mdxishComponentBlocks`: lowercase tags only promote
 * when they carry an expression attribute; plain inline HTML like
 * `<a href="x">` stays as an html node for rehype-raw.
 */
declare const mdxishInlineMdxHtmlBlocks: Plugin<[{
    safeMode?: boolean;
}?], Root>;
export default mdxishInlineMdxHtmlBlocks;
