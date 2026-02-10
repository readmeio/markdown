import type { Element, Parent, Root, Text } from 'hast';

import { visit } from 'unist-util-visit';

// Most of the use case for this transformation is for texts under paragraphs, and also lists
// To avoid accidentally applying the transformation when not supposed to,
// bias to leave the behavior as is. There is a lesser amount of elements tags
// we want to apply this transformer to, compared to the ones we don't want.
const INCLUDED_PARENTS_TAGS = new Set(['p', 'li']);

/**
 * Rehype plugin to parse unparsed \n in text nodes and split it
 * Remark by default will combine consecutive lines to 1 node and hence 1 line. It needs an
 * empty line between 2 lines to register them as separate lines
 * This transformer would allow consecutive lines in markdown to be rendered as separate lines
 * without the need for the empty line.
 */
const splitNewlines = () => (tree: Root) => {
  visit(tree, 'text', (node: Text, index: number, parent: Parent) => {
    if (parent.type !== 'element' || !INCLUDED_PARENTS_TAGS.has((parent as Element).tagName)) return;
    // If the node is a lone \n, that means the split has already happened and we don't need to
    // transform it
    if (typeof node.value !== 'string' || !node.value.trim() || !node.value.includes('\n')) return;

    // Split text by \n into different nodes, with the \n being converted to <br> element
    // to make sure the new line is applied when rendering
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
