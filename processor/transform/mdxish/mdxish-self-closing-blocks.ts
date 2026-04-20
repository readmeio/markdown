import type { Node, Parent, Paragraph } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { parseAttributes } from '../../../lib/utils/mdxish/mdxish-component-tag-parser';

/**
 * Tags to process as self-closing blocks.
 */
const SELF_CLOSING_BLOCK_TAGS = new Set(['Embed', 'Recipe']);

// Regex to match self-closing PascalCase tags (handles multi-line)
const selfClosingTagPattern = /^<([A-Z][A-Za-z0-9_]*)([\s\S]*?)\/>$/;

/**
 * Try to convert a paragraph node containing a self-closing JSX component into an mdxJsxFlowElement.
 * Returns the new node if conversion succeeded, or null if the node doesn't match.
 */
const tryConvertToMdxNode = (node: Paragraph): (MdxJsxFlowElement) | null => {
  if (node.children.length !== 1) return null;

  const child = node.children[0];
  if (child.type !== 'html') return null;

  const value = (child as { value?: string }).value?.trim();
  if (!value) return null;

  const match = value.match(selfClosingTagPattern);
  if (!match) return null;

  const [, tag, attrString] = match;
  if (!SELF_CLOSING_BLOCK_TAGS.has(tag)) return null;

  return {
    type: 'mdxJsxFlowElement',
    name: tag,
    attributes: parseAttributes(attrString),
    children: [],
    position: node.position,
  };
};

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
const mdxishSelfClosingBlocks: Plugin<[], Parent> = () => tree => {
  visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
    if (index === undefined || !parent) return;
    const mdxNode = tryConvertToMdxNode(node);
    if (mdxNode) {
      (parent.children as Node[]).splice(index, 1, mdxNode);
    }
  });
};

export default mdxishSelfClosingBlocks;
