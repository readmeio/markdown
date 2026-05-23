import type { Parent } from 'mdast';
import type { Plugin } from 'unified';
/**
 * Transform paragraph-wrapped self-closing JSX components into mdxJsxFlowElement nodes.
 *
 * CommonMark wraps multi-line JSX in paragraphs when the opening tag isn't complete
 * on one line. This plugin detects these structures and unwraps them for components
 * in the SELF_CLOSING_BLOCK_TAGS allowlist.
 *
 * Input structure:
 * ```
 * paragraph > html: "<Embed\n  typeOfEmbed=\"youtube\"\n/>"
 * ```
 *
 * Output structure:
 * ```
 * mdxJsxFlowElement: { name: "Embed", attributes: [...], children: [] }
 * ```
 */
declare const mdxishSelfClosingBlocks: Plugin<[], Parent>;
export default mdxishSelfClosingBlocks;
