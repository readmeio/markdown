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

      // @ts-expect-error - estree is not defined on our mdx types?!
      if (node.data.estree.type !== 'Program') return;
      // @ts-expect-error - estree is not defined on our mdx types?!
      const [expression] = node.data.estree.body;
      if (
        !expression ||
        expression.type !== 'ExpressionStatement' ||
        expression.expression.object?.name !== 'user' ||
        !['Literal', 'Identifier'].includes(expression.expression.property?.type)
      )
        return;

      const name =
        expression.expression.property.type === 'Identifier'
          ? expression.expression.property.name
          : expression.expression.property.value;

      let variable = asMdx
        ? ({
            type: 'mdxJsxTextElement',
            name: 'Variable',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'name',
                value: name,
              },
            ],
            children: [],
            position: node.position,
          } as MdxJsxTextElement)
        : ({
            type: NodeTypes.variable,
            data: {
              hName: 'Variable',
              hProperties: {
                name,
              },
            },
            value: `{${node.value}}`,
            position: node.position,
          } as Variable);

      parent.children.splice(index, 1, variable);
    });

    return tree;
  };

export default variables;
