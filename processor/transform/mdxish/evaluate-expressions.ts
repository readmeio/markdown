import type { Root, Text } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';
import type { Position } from 'unist';
import type { VFile } from 'vfile';

import React from 'react';
import { visit } from 'unist-util-visit';

import { evalExpression } from '../../../lib/utils/mdxish/mdxish-expression';

import { reactElementToHast } from './react-element-to-hast';

/**
 * We divide the result of an expression into two categories:
 * 1. Renderable values: HTML, JSX, e.g. .map() returning JSX 
 * 2. Non-renderable values: a string, number, or object, regular JS values
 */
const isRenderable = (value: unknown): boolean => {
  if (React.isValidElement(value)) return true;
  return Array.isArray(value) && value.some(isRenderable);
};

/** Turn a non-renderable evaluation result into a text node. */
const createTextNode = (result: unknown, position: Position | undefined): Text => {
  if (result === null || result === undefined || typeof result === 'boolean') {
    return { type: 'text', value: '', position };
  }
  if (typeof result === 'object') return { type: 'text', value: JSON.stringify(result), position };
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

    const expressionNode = node as MdxFlowExpression | MdxTextExpression;
    const { value, position } = expressionNode;
    const expression = value?.trim();
    if (!expression) return;

    try {
      const result = evalExpression(expression, scope);
      if (isRenderable(result)) {
        // Stash hast built straight from the React tree; `mdxExpressionHandler` emits it and it 
        // passes through rehypeRaw/parse5 step later in the pipeline. This ensures that the 
        // expression result is not parsed by parse5 and fragmenting the nesting that is valid JSX 
        // but invalid HTML — e.g. an `<a>` wrapping `<a>`.
        expressionNode.data = { ...expressionNode.data, hChildren: reactElementToHast(result) };
      } else {
        parent.children.splice(index, 1, createTextNode(result, position));
      }
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
