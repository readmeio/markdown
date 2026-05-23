import type { Plugin } from 'unified';
/**
 * A remark plugin that normalizes malformed bold and italic markers in text nodes.
 * Detects patterns like `** bold**`, `Hello** Wrong Bold**`, `__ bold__`, `Hello__ Wrong Bold__`,
 * `* italic*`, `Hello* Wrong Italic*`, `_ italic_`, or `Hello_ Wrong Italic_`
 * and converts them to proper strong/emphasis nodes, matching the behavior of the legacy rdmd engine.
 *
 * Supports both asterisk (`**bold**`, `*italic*`) and underscore (`__bold__`, `_italic_`) syntax.
 * Also supports snake_case content like `** some_snake_case**`.
 *
 * This runs after remark-parse, which (in v11+) is strict and doesn't parse
 * malformed emphasis syntax. This plugin post-processes the AST to handle these cases.
 */
declare const normalizeEmphasisAST: Plugin;
export default normalizeEmphasisAST;
