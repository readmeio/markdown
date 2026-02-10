import type { Element, Parent, Root, Text } from 'hast';

import { visit } from 'unist-util-visit';

// Text inside these tags shouldn't be modified
const EXCLUDED_PARENTS = new Set(['code', 'pre', 'script', 'style', 'textarea']);

/**
 * Rehype plugin to split text nodes on literal newlines into separate text nodes.
 * This would allow consecutive lines in markdown to actually be in separate lines
 */
const splitNewlines = () => (tree: Root) => {
  visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
    if (!parent || typeof index !== 'number') return;
    if (parent.type === 'element' && EXCLUDED_PARENTS.has((parent as Element).tagName)) return;
    if (typeof node.value !== 'string' || !node.value.trim() || !node.value.includes('\n')) return;

    // Splint text by \n into different nodes, with the \n being converted to <br> element
    // to make sure the new line is applied on render
    const parts = node.value.split('\n');
    const replacement: (Element | Text)[] = [];

    parts.forEach((part, i) => {
      if (part.length > 0) replacement.push({ type: 'text', value: part });
      if (i < parts.length - 1) replacement.push({ type: 'element', tagName: 'br', properties: {}, children: [] });
    });

    if (replacement.length === 0) return;
    parent.children.splice(index, 1, ...replacement);
  });


  return tree;
};

export default splitNewlines;
