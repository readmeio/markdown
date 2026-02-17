import type { Code, InlineCode, Node } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { convertLegacyVariables } from '../../../lib/micromark/legacy-variable/convert';

const isCodeLike = (node: Node): node is Code | InlineCode => node.type === 'code' || node.type === 'inlineCode';

const legacyVariablesCodeTransformer: Plugin = () => tree => {
  visit(tree, isCodeLike, node => {
    const nextValue = convertLegacyVariables(node.value);

    if (nextValue !== node.value) {
      node.value = nextValue;
    }
  });

  return tree;
};

export default legacyVariablesCodeTransformer;
