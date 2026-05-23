import type { Parent } from 'mdast';
import type { Plugin } from 'unified';
/**
 * Transforms inline MDX blocks inside html nodes (e.g. <Anchor>) into proper MDAST phrasing content.
 *
 * Inline components are excluded from mdxishComponentBlocks (which only handles block-level
 * elements), so they remain as scattered html/text/html sibling nodes inside a paragraph.
 * This plugin merges them into a single typed MDAST node.
 */
declare const mdxishInlineMdxComponents: Plugin<[], Parent>;
export default mdxishInlineMdxComponents;
