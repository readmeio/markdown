import type { Root } from 'hast';
import type { Plugin } from 'unified';
/**
 * Rewrite `mdx-jsx` nodes (stitched through rehypeRaw untouched) into standard
 * `element` nodes so rehype-react and downstream element-walking plugins handle
 * them normally. Non-primitive attribute values — objects, arrays, numbers —
 * stay as real JS values here because they never went through parse5.
 *
 * Tag names that match a standard HTML element are lowercased to match what
 * parse5 used to produce during the rehypeRaw round-trip (e.g. `<Table>` that
 * slipped past the mdxishTables transformer still ends up as `<table>`).
 * PascalCase custom component names are left alone for `rehypeMdxishComponents`.
 */
declare const normalizeMdxJsxNodes: Plugin<[], Root>;
export default normalizeMdxJsxNodes;
