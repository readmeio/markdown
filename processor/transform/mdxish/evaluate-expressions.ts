import type { Root } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { evaluate } from '../../utils';

/**
 * AST transformer to evaluate MDX expressions.
 * Replaces mdxFlowExpression and mdxTextExpression nodes with their evaluated values.
 * Runs with no scope, so only self-contained expressions resolve
 * (e.g. `{1+1}`, `{"hi".toUpperCase()}`); anything that references an external
 * identifier falls through to the error branch and is kept as literal `{...}` text.
 */
const evaluateExpressions: Plugin<[], Root> = () => tree => {
  visit(tree, ['mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
    if (!parent || index === null || index === undefined) return;

    const expressionNode = node as MdxFlowExpression | MdxTextExpression;
    if (!('value' in expressionNode)) return;

    const expression = expressionNode.value.trim();
    // Skip if expression is empty (shouldn't happen, but defensive)
    if (!expression) return;

    try {
      const result = evaluate(expression);

      // Extract evaluated value text
      let textValue: string;
      if (result === null || result === undefined) {
        textValue = '';
      } else if (typeof result === 'object') {
        textValue = JSON.stringify(result);
      } else {
        textValue = String(result);
      }

      // Replace expression node with text node since the expression is conceptually a text
      parent.children.splice(index, 1, {
        type: 'text',
        value: textValue,
        position: expressionNode.position,
      });
    } catch (_error) {
      // If evaluation fails, leave the expression as-is (fallback to text)
      // we still need to manually escape escaped characters because the expression
      // parser treats the contents as code instead of text, skipping the backslash escapes
      const processed = expression.replace(/\\([!-/:-@[-`{-~])/g, '$1');
      parent.children.splice(index, 1, {
        type: 'text',
        value: `{${processed}}`,
        position: expressionNode.position,
      });
    }
  });

  return tree;
};

export default evaluateExpressions;
