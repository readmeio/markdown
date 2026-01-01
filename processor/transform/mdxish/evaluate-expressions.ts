import type { JSXContext } from './preprocess-jsx-expressions';
import type { Root } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

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

      // JSX attribute expressions are handled by preprocessing; code blocks are protected
      const expression = expressionNode.value.trim();

      // Skip if expression is empty (shouldn't happen, but defensive)
      if (!expression) return;

      try {
        // Evaluate the expression using the context
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);

        // eslint-disable-next-line no-new-func
        const func = new Function(...contextKeys, `return ${expression}`);
        const result = func(...contextValues);

        // Convert result to text node(s)
        if (result === null || result === undefined) {
          // Replace with empty text node (don't remove, as it affects positioning)
          parent.children.splice(index, 1, {
            type: 'text',
            value: '',
            position: node.position,
          });
          return;
        }

        let textValue: string;
        if (typeof result === 'object') {
          textValue = JSON.stringify(result);
        } else {
          textValue = String(result).replace(/\s+/g, ' ').trim();
        }

        // Replace expression node with text node
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
