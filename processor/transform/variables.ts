import { Transform } from 'mdast-util-from-markdown';
import { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { NodeTypes } from '../../enums';
import { Variable } from '../../types';

import { visit } from 'unist-util-visit';

const variables =
  ({ asMdx } = { asMdx: true }): Transform =>
  tree => {
    visit(tree, (node, index, parent) => {
      if (!['mdxFlowExpression', 'mdxTextExpression'].includes(node.type) || !('value' in node)) return;

      const match = node.value.match(/^user\.(?<value>.*)$/);
      if (!match) return;

      let variable = asMdx
        ? ({
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
          } as MdxJsxTextElement)
        : ({
            type: NodeTypes.variable,
            name: match.groups.value,
            value: `{${node.value}}`,
          } as Variable);

      parent.children.splice(index, 1, variable);
    });

    return tree;
  };

export default variables;
