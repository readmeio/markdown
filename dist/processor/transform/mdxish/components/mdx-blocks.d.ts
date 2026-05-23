import type { Parent } from 'mdast';
import type { Plugin } from 'unified';
export { parseAttributes, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';
/**
 * Transform PascalCase HTML nodes into mdxJsxFlowElement nodes.
 *
 * Remark parses unknown/custom component tags as raw HTML nodes.
 * These are the custom readme MDX syntax for components.
 * This transformer identifies these patterns and converts them to proper MDX JSX elements so they
 * can be accurately recognized and rendered later with their component definition code.
 *
 * The mdx-component micromark tokenizer ensures that multi-line components are captured
 * as single HTML nodes, so this transformer only needs to handle two cases:
 *
 * ### 1. Self-closing tags
 * ```
 * <Component />
 * ```
 * Parsed as: `html: "<Component />"`
 *
 * ### 2. Self-contained blocks (entire component in single HTML node)
 * ```
 * <Component>
 *   content
 * </Component>
 * ```
 * Parsed as: `html: "<Component>\n  content\n</Component>"`
 * The opening tag, content, and closing tag are all captured in one HTML node
 * (guaranteed by the mdx-component tokenizer).
 */
declare const mdxishMdxComponentBlocks: Plugin<[{
    safeMode?: boolean;
}?], Parent>;
export default mdxishMdxComponentBlocks;
