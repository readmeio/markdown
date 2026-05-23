import type { Parent } from 'mdast';
import type { Plugin } from 'unified';
/**
 * Transform mdxJsxFlowElement nodes, magic block nodes, and HTML figure elements
 * into proper MDAST node types.
 *
 * This transformer runs after mdxishComponentBlocks and converts:
 * - JSX component elements (Image, Callout, Embed, Recipe, figure) into their corresponding MDAST types
 * - Magic block image nodes (type: 'image') into image-block
 * - Magic block embed nodes (type: 'embed') into embed-block
 * - Fragmented HTML <figure> blocks (from terminateHtmlFlowBlocks) back into figure nodes
 * - Figure nodes (from magic blocks, HTML, or JSX) into flat image-block with caption string
 * - Normalizes all image-block attrs (border, align, sizing, caption) to a consistent shape
 *
 * This is controlled by the `newEditorTypes` flag to maintain backwards compatibility.
 */
declare const mdxishJsxToMdast: Plugin<[], Parent>;
export default mdxishJsxToMdast;
