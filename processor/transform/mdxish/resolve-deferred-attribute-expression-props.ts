import type { MdxJsx } from '../../../types';
import type { Root } from 'hast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import React from 'react';
import { visit } from 'unist-util-visit';

import { evalExpression } from '../../../lib/utils/mdxish/mdxish-expression';

import { isPlainObject, styleObjectToCssText } from './style-object-to-css';

/**
 * Resolve attribute expressions that `mdxJsxElementHandler` deferred.
 *
 * The handler stashed each attribute expression's source in `node.data.deferredExpressions`
 * (keyed by prop name) instead of evaluating eagerly, because an eager result can be a React
 * element or function that rehypeRaw's `structuredClone` passthrough rejects. Now that we're
 * past the clone, evaluate each source with a scope of `{ React, ...mdxishScope }` and write
 * the real value into `properties` (e.g. an array of objects whose fields are React elements).
 *
 * Must run after `rehypeRaw` (past the clone) but before `normalizeMdxJsxNodes` rewrites these
 * `mdx-jsx` nodes into plain elements. Skipped in safeMode, which keeps expressions literal.
 */
const resolveDeferredAttributeExpressionProps: Plugin<[], Root> = () => (tree, file: VFile) => {
  const scope: Record<string, unknown> = { ...file.data.mdxishScope, React };

  visit(tree, 'mdx-jsx', (node: MdxJsx) => {
    const deferredExpressions = node.data?.deferredExpressions;
    if (!deferredExpressions) return;

    const properties: Record<string, unknown> = node.properties;
    Object.entries(deferredExpressions).forEach(([name, source]) => {
      try {
        const result = evalExpression(source, scope);
        // hast/HTML `style` is a plain CSS string; a `style={{...}}` expression evaluates to
        // a JS object, which must be serialized or it renders as the literal "[object Object]".
        properties[name] = name === 'style' && isPlainObject(result) ? styleObjectToCssText(result) : result;
      } catch {
        // Evaluation failed — fall back to the raw expression source so the attribute
        // renders as readable text rather than disappearing.
        properties[name] = source;
      }
    });

    delete node.data.deferredExpressions;
  });

  return tree;
};

export default resolveDeferredAttributeExpressionProps;
