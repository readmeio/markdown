import type { Html, Node, Parent, PhrasingContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { INLINE_COMPONENT_TAGS } from './constants';
import { parseAttributes } from './mdxish-component-blocks';

// Matches any PascalCase inline component opening tag. Groups: (name, attrs).
// Uses [A-Za-z0-9_]* to match block version in mdxish-component-blocks.ts
const INLINE_COMPONENT_OPEN_RE = /^<([A-Z][A-Za-z0-9_]*)(\s[^>]*)?>$/;

function toMdxJsxTextElement(name: string, attributes: MdxJsxAttribute[], children: PhrasingContent[]): MdxJsxTextElement {
  return {
    type: 'mdxJsxTextElement',
    name,
    attributes,
    children,
  };
}

/**
 * Transforms inline html component nodes (e.g. <Anchor>) into proper MDAST phrasing content.
 *
 * Inline components are excluded from mdxishComponentBlocks (which only handles block-level
 * elements), so they remain as scattered html/text/html sibling nodes inside a paragraph.
 * This plugin merges them into a single typed MDAST node.
 */
const mdxishInlineComponents: Plugin<[], Parent> = () => tree => {
  visit(tree, 'html', (node: Html, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const match = node.value?.match(INLINE_COMPONENT_OPEN_RE);
    if (!match) return;

    const [, name, attrStr] = match;
    if (!INLINE_COMPONENT_TAGS.has(name)) return;

    // Parse attributes directly - preserves all attribute types (strings, booleans, objects, arrays)
    const attributes = parseAttributes(attrStr ?? '');

    // Find closing tag with whitespace-tolerant matching
    let closeIdx = index + 1;
    while (closeIdx < parent.children.length) {
      const sib = parent.children[closeIdx] as { type: string; value?: string };
      if (sib.type === 'html' && sib.value?.trim() === `</${name}>`) break;
      closeIdx += 1;
    }
    if (closeIdx >= parent.children.length) return;

    // Extract all nodes between opening tag (index) and closing tag (closeIdx).
    // These are the inline component's children (e.g., text, emphasis, links).
    // Example: "<Anchor>click **here**</Anchor>" → children = [text, strong]
    const children = parent.children.slice(index + 1, closeIdx) as PhrasingContent[];
    const newNode = toMdxJsxTextElement(name, attributes, children);
    (parent.children as Node[]).splice(index, closeIdx - index + 1, newNode as unknown as Node);
  });
};

export default mdxishInlineComponents;
