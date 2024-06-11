import { Transform } from 'mdast-util-from-markdown';
import { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

const variables = (): Transform => tree => {
  visit(tree, (node, index, parent) => {
    if (!['mdxFlowExpression', 'mdxTextExpression'].includes(node.type) || !('value' in node)) return;

    const match = node.value.match(/^user\.(?<value>.*)$/);
    if (!match) return;

    let variable = {
      type: 'mdxJsxTextElement',
      name: 'Variable',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'name',
          value: match.groups.value,
        },
      ],
      children: [],
    } as MdxJsxTextElement;

    parent.children.splice(index, 1, variable);
  });

  return tree;
};

export default variables;
