import { NodeTypes } from '../../enums';
import { Transform } from 'mdast-util-from-markdown';
import { Variable } from '../../types';

import { visit } from 'unist-util-visit';

const variables = (): Transform => tree => {
  visit(tree, (node, index, parent) => {
    if (!['mdxFlowExpression', 'mdxTextExpression'].includes(node.type) || !('value' in node)) return;

    const match = node.value.match(/^user\.(?<value>.*)$/);
    if (!match) return;

    let variable = {
      type: NodeTypes.variable,
      name: match.groups.value,
      value: `{${node.value}}`,
    } as Variable;

    parent.children.splice(index, 1, variable);
  });

  return tree;
};

export default variables;
