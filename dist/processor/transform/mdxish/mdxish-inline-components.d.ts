import type { Parent } from 'mdast';
import type { Plugin } from 'unified';
/**
 * Transforms inline html component nodes (e.g. <Anchor>) into proper MDAST phrasing content.
 *
 * Inline components are excluded from mdxishComponentBlocks (which only handles block-level
 * elements), so they remain as scattered html/text/html sibling nodes inside a paragraph.
 * This plugin merges them into a single typed MDAST node.
 */
declare const mdxishInlineComponents: Plugin<[], Parent>;
export default mdxishInlineComponents;
