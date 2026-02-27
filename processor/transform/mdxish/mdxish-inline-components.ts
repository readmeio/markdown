import type { Html, Node, Parent, PhrasingContent } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { parseAttributes } from './mdxish-component-blocks';

// Matches any PascalCase inline component opening tag. Groups: (name, attrs).
const INLINE_COMPONENT_OPEN_RE = /^<([A-Z][a-zA-Z]*)(\s[^>]*)?>$/;

// To add a new inline component: add it to both EXCLUDED_TAGS in mdxish-component-blocks.ts
// and to this set.
const INLINE_COMPONENTS = new Set(['Anchor']);

function toMdxJsxTextElement(name: string, attrs: Record<string, string>, children: PhrasingContent[]): MdxJsxTextElement {
  return {
    type: 'mdxJsxTextElement',
    name,
    attributes: Object.entries(attrs).map(([attrName, value]) => ({
      type: 'mdxJsxAttribute',
      name: attrName,
      value,
    })),
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
    if (!INLINE_COMPONENTS.has(name)) return;

    const attrMap = parseAttributes(attrStr ?? '').reduce(
      (acc, attr) => {
        if ('name' in attr && typeof attr.value === 'string') acc[attr.name] = attr.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    let closeIdx = index + 1;
    while (closeIdx < parent.children.length) {
      const sib = parent.children[closeIdx] as { type: string; value?: string };
      if (sib.type === 'html' && sib.value === `</${name}>`) break;
      closeIdx += 1;
    }
    if (closeIdx >= parent.children.length) return;

    const children = parent.children.slice(index + 1, closeIdx) as PhrasingContent[];
    const newNode = toMdxJsxTextElement(name, attrMap, children);
    (parent.children as Node[]).splice(index, closeIdx - index + 1, newNode as unknown as Node);
  });
};

export default mdxishInlineComponents;
