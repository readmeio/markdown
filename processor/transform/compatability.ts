import { Emphasis, Strong, Node } from 'mdast';
import { EXIT, SKIP, visit } from 'unist-util-visit';
import { Transform } from 'mdast-util-from-markdown';

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

  return tree;
};

export default compatibilityTransfomer;
