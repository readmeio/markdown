import type { Node, Parent, Paragraph } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { parseAttributes } from './mdxish-component-blocks';

/**
 * Tags to process as self-closing blocks.
 * These are components that are typically written as multi-line self-closing tags.
 */
const SELF_CLOSING_BLOCK_TAGS = new Set(['Embed']);

// Regex to match self-closing PascalCase tags (handles multi-line)
const selfClosingTagPattern = /^<([A-Z][A-Za-z0-9_]*)([\s\S]*?)\/>$/;

/**
 * Try to convert a paragraph node containing a self-closing JSX component into an mdxJsxFlowElement.
 * Returns the new node if conversion succeeded, or null if the node doesn't match.
 */
const tryConvertToMdxNode = (node: Node): (MdxJsxFlowElement & { data?: { raw?: string } }) | null => {
  if (node.type !== 'paragraph') return null;

  const paragraph = node as Paragraph;
  if (paragraph.children.length !== 1) return null;

  const child = paragraph.children[0];
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
    position: paragraph.position,
    data: { raw: value },
  };
};

/**
 * Transform paragraph-wrapped self-closing JSX components into mdxJsxFlowElement nodes.
 *
 * CommonMark wraps multi-line JSX in paragraphs when the opening tag isn't complete
 * on one line. This plugin detects these structures and unwraps them.
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
  const visit = (parent: Parent) => {
    for (let i = 0; i < parent.children.length; i += 1) {
      const node = parent.children[i];

      // Recurse into children first
      if ('children' in node && Array.isArray((node as Parent).children)) {
        visit(node as Parent);
      }

      // Try to convert paragraph to mdxJsxFlowElement
      const mdxNode = tryConvertToMdxNode(node);
      if (mdxNode) {
        (parent.children as Node[]).splice(i, 1, mdxNode);
      }
    }
  };

  visit(tree);
  return tree;
};

export default mdxishSelfClosingBlocks;
