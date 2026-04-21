import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { STANDARD_HTML_TAGS } from '../../../utils/common-html-words';

// parse5 (and the HTML5 tree-construction spec) rewrites a few legacy tag names
// during parsing. Since rehypeRaw's passThrough skips parse5 entirely for our
// mdx-jsx nodes, we have to apply the same aliases ourselves or lowercase-HTML
// tests that used to get the rewrites for free will regress.
const TAG_NAME_ALIASES: Record<string, string> = {
  image: 'img',
};

function normalizeTagName(tagName: string): string {
  const lower = tagName.toLowerCase();
  if (TAG_NAME_ALIASES[lower]) return TAG_NAME_ALIASES[lower];
  if (STANDARD_HTML_TAGS.has(lower)) return lower;
  return tagName;
}

/**
 * Rewrite `mdx-jsx` nodes (stitched through rehypeRaw untouched) into standard
 * `element` nodes so rehype-react and downstream element-walking plugins handle
 * them normally. Non-primitive attribute values — objects, arrays, numbers —
 * stay as real JS values here because they never went through parse5.
 *
 * Tag names that match a standard HTML element are lowercased to match what
 * parse5 used to produce during the rehypeRaw round-trip (e.g. `<Table>` that
 * slipped past the mdxishTables transformer still ends up as `<table>`).
 * PascalCase custom component names are left alone for `rehypeMdxishComponents`.
 */
const normalizeMdxJsxNodes: Plugin<[], Root> = () => tree => {
  visit(tree, 'mdx-jsx', (node, index, parent) => {
    if (!parent || index === null || index === undefined) return;
    const element: Element = {
      type: 'element',
      tagName: normalizeTagName(node.tagName),
      // `MdxJsx.properties` is intentionally wider than hast's `Properties`
      // (arbitrary JS values for React props); narrow it back at the boundary.
      properties: node.properties,
      children: node.children,
      position: node.position,
    };
    parent.children[index] = element;
  });
};

export default normalizeMdxJsxNodes;
