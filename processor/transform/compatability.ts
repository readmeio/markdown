import { Emphasis, Image, Strong, Node, Parent } from 'mdast';
import { EXIT, SKIP, visit } from 'unist-util-visit';
import { Transform } from 'mdast-util-from-markdown';
import { phrasing } from 'mdast-util-phrasing';

const strongTest = (node: Node): node is Strong | Emphasis => ['emphasis', 'strong'].includes(node.type);

const compatibilityTransfomer = (): Transform => tree => {
  const trimEmphasis = (node: Emphasis | Strong) => {
    visit(node, 'text', child => {
      child.value = child.value.trim();
      return EXIT;
    });

    return node;
  };

  visit(tree, strongTest, node => {
    trimEmphasis(node);
    return SKIP;
  });

  visit(tree, 'image', (node: Image, index: number, parent: Parent) => {
    if (phrasing(parent) || !parent.children.every(child => child.type === 'image' || !phrasing(child))) return;

    parent.children.splice(index, 1, { type: 'paragraph', children: [node] });
  });

  return tree;
};

export default compatibilityTransfomer;
