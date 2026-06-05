import type { Html, Root, Text } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';
import type { Position } from 'unist';
import type { VFile } from 'vfile';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { visit } from 'unist-util-visit';

import { evalExpression } from '../../../lib/utils/mdxish/mdxish-jsx-expression';

/** Given the type of the expression result, create the corresponding mdast node. */
const createEvaluatedNode = (result: unknown, position: Position | undefined): Html | Text => {
  if (result === null || result === undefined) {
    return { type: 'text', value: '', position };
  } else if (React.isValidElement(result)) {
    // Convert react elements to its HTML representation
    // This must come before the object check as this is a subset of it
    return { type: 'html', value: renderToStaticMarkup(result), position };
  } else if (typeof result === 'object') {
    return { type: 'text', value: JSON.stringify(result), position };
  }
  return { type: 'text', value: String(result), position };
};

/**
 * AST transformer to evaluate MDX expressions.
 * Replaces mdxFlowExpression and mdxTextExpression nodes with their evaluated values.
 * Self-contained expressions resolve directly (e.g. `{1+1}`); expressions that
 * reference identifiers can resolve if those identifiers were introduced by an
 * earlier `export const/function` (collected onto `file.data.mdxishScope`).
 * Anything else falls through to the error branch and is kept as literal `{...}` text.
 */
const evaluateExpressions: Plugin<[], Root> = () => (tree, file: VFile) => {
  const scope: Record<string, unknown> = { ...(file.data.mdxishScope ), React };

  visit(tree, ['mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
    if (!parent || index === null || index === undefined) return;

    const { value, position } = node as MdxFlowExpression | MdxTextExpression;
    const expression = value?.trim();
    if (!expression) return;

    try {
      const result = evalExpression(expression, scope);
      parent.children.splice(index, 1, createEvaluatedNode(result, position));
    } catch (_error) {
      // Evaluation failed — fall back to literal `{...}` text. The expression
      // parser treats contents as code, so backslash escapes aren't applied;
      // restore them here so e.g. `{\!}` round-trips to `{!}`.
      const processed = expression.replace(/\\([!-/:-@[-`{-~])/g, '$1');
      parent.children.splice(index, 1, { type: 'text', value: `{${processed}}`, position });
    }
  });

  return tree;
};

export default evaluateExpressions;
