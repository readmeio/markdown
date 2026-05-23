import type { Parent } from 'mdast';
import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';
/**
 * Convert raw attribute string into mdxJsxAttribute entries.
 * Handles both key-value attributes (theme="info") and boolean attributes (empty).
 */
export declare const parseAttributes: (raw: string) => MdxJsxAttribute[];
/**
 * Transform PascalCase HTML nodes into mdxJsxFlowElement nodes.
 *
 * Remark parses unknown/custom component tags as raw HTML nodes.
 * These are the custom readme MDX syntax for components.
 * This transformer identifies these patterns and converts them to proper MDX JSX elements so they
 * can be accurately recognized and rendered later with their component definition code.
 * Though for some tags, we need to handle them specially
 *
 * ## Supported HTML Structures
 *
 * ### 1. Self-closing tags
 * ```
 * <Component />
 * ```
 * Parsed as: `html: "<Component />"`
 *
 * ### 2. Self-contained blocks (entire component in single HTML node)
 * ```
 * <Button>Click me</Button>
 * ```
 * ```
 * <Component>
 *   <h2>Title</h2>
 *   <p>Content</p>
 * </Component>
 * ```
 * Parsed as: `html: "<Component>\n  <h2>Title</h2>\n  <p>Content</p>\n</Component>"`
 * The opening tag, content, and closing tag are all captured in one HTML node.
 *
 * ### 3. Multi-sibling components (closing tag in a following sibling)
 * Handles various structures where the closing tag is in a later sibling, such as:
 *
 * #### 3a. Block components (closing tag in sibling paragraph)
 * ```
 * <Callout>
 * Some **markdown** content
 * </Callout>
 * ```
 *
 * #### 3b. Multi-paragraph components (closing tag several siblings away)
 * ```
 * <Callout>
 *
 * First paragraph
 *
 * Second paragraph
 * </Callout>
 * ```
 *
 * #### 3c. Nested components split by blank lines (closing tag embedded in HTML sibling)
 * ```
 * <Outer>
 *   <Inner>content</Inner>
 *
 *   <Inner>content</Inner>
 * </Outer>
 * ```
 */
declare const mdxishComponentBlocks: Plugin<[], Parent>;
export default mdxishComponentBlocks;
