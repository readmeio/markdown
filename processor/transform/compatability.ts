import { Emphasis, Image, Strong, Node, Parent } from 'mdast';
import { EXIT, SKIP, visit } from 'unist-util-visit';
import { Transform } from 'mdast-util-from-markdown';
import { phrasing } from 'mdast-util-phrasing';

const strongTest = (node: Node): node is Strong | Emphasis => ['emphasis', 'strong'].includes(node.type);

const trimEmphasis = (node: Emphasis | Strong) => {
  visit(node, 'text', child => {
    child.value = child.value.trim();
    return EXIT;
  });

  return node;
};

const addSpaceBefore = (index: number, parent: Parent) => {
  if (!(index > 0 && parent.children[index - 1])) return;

  const prev = parent.children[index - 1];
  if (!('value' in prev) || prev.value.endsWith(' ') || prev.type === 'escape') return;

  parent.children.splice(index, 0, { type: 'text', value: ' ' });
};

const addSpaceAfter = (index: number, parent: Parent) => {
  if (!(index < parent.children.length - 1 && parent.children[index + 1])) return;

  const nextChild = parent.children[index + 1];
  if (!('value' in nextChild) || nextChild.value.startsWith(' ')) return;

  parent.children.splice(index + 1, 0, { type: 'text', value: ' ' });
};

const compatibilityTransfomer = (): Transform => tree => {
  visit(tree, strongTest, (node, index, parent: Parent) => {
    trimEmphasis(node);
    addSpaceBefore(index, parent);
    addSpaceAfter(index, parent);

    return SKIP;
  });

  visit(tree, 'image', (node: Image, index: number, parent: Parent) => {
    if (phrasing(parent) || !parent.children.every(child => child.type === 'image' || !phrasing(child))) return;

    parent.children.splice(index, 1, { type: 'paragraph', children: [node] });
  });

  return tree;
};

export default compatibilityTransfomer;
