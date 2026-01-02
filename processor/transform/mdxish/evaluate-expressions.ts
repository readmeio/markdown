import type { Root } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { evaluateExpression, type JSXContext } from './preprocess-jsx-expressions';

/**
 * AST transformer to evaluate MDX expressions using the provided context.
 * Replaces mdxFlowExpression and mdxTextExpression nodes with their evaluated values.
 */
const evaluateExpressions: Plugin<[{ context?: JSXContext }], Root> =
  ({ context = {} } = {}) =>
  tree => {
    visit(tree, ['mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;

      const expressionNode = node as MdxFlowExpression | MdxTextExpression;
      if (!('value' in expressionNode)) return;

      const expression = expressionNode.value.trim();
      // Skip if expression is empty (shouldn't happen, but defensive)
      if (!expression) return;

      try {
        const result = evaluateExpression(expression, context);

        // Extract evaluated value text
        let textValue: string;
        if (result === null || result === undefined) {
          textValue = '';
        } else if (typeof result === 'object') {
          textValue = JSON.stringify(result);
        } else {
          textValue = String(result).replace(/\s+/g, ' ').trim();
        }

        // Replace expression node with text node since the expression is conceptually a text
        parent.children.splice(index, 1, {
          type: 'text',
          value: textValue,
          position: node.position,
        });
      } catch (_error) {
        // If evaluation fails, leave the expression as-is (fallback to text)
        parent.children.splice(index, 1, {
          type: 'text',
          value: `{${expression}}`,
          position: node.position,
        });
      }
    });

    return tree;
  };

export default evaluateExpressions;
