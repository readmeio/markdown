import type { Variable } from '../../types';
import type { Expression } from 'estree';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

/**
 * Checks if an expression is a hyphenated user variable (e.g., `user.X-API-Key`).
 * Estree parses `user.X-API-Key` as subtraction: `user.X - API - Key`, creating a BinaryExpression.
 */
function isHyphenatedUserVariable(expr: Expression): boolean {
  if (expr.type !== 'BinaryExpression' || expr.operator !== '-') return false;

  if (expr.right.type !== 'Identifier') return false;

  return true;
}

const variables =
  ({ asMdx } = { asMdx: true }): Transform =>
  tree => {
    visit(tree, (node, index, parent) => {
      if (!['mdxFlowExpression', 'mdxTextExpression'].includes(node.type) || !('value' in node)) return;

      let name: string | undefined;

      // @ts-expect-error - estree is not defined on our mdx types
      if (node.data?.estree?.type !== 'Program') return;
      // @ts-expect-error - estree is not defined on our mdx types
      const [expression] = node.data.estree.body;
      if (!expression || expression.type !== 'ExpressionStatement') return;

      const expr = expression.expression;

      if (
        expr.type === 'MemberExpression' &&
        expr.object?.name === 'user' &&
        ['Literal', 'Identifier'].includes(expr.property?.type)
      ) {
        // Standard case: `user.name` or `user['name']`
        name = expr.property.type === 'Identifier' ? expr.property.name : expr.property.value;
      } else if (isHyphenatedUserVariable(expr)) {
        // Hyphenated variable: `user.X-API-Key` parsed as `user.X - API - Key`
        // Extract the full variable name from node.value
        const value = node.value;
        const match = value.match(/^user\.([\w-]*)$/);
        if (match) {
          name = match[1];
        }
      }

      if (!name) return;

      const variable = asMdx
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
