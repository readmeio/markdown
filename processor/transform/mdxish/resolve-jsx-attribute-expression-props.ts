import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import React from 'react';
import { visit } from 'unist-util-visit';

import { evalJsxExpression, getJsxExprSource, isJsxExprSentinel } from '../../../lib/utils/mdxish/mdxish-jsx-expression';

/**
 * Resolve JSX-bearing attribute expressions that `mdxJsxElementHandler` deferred.
 *
 * Those expressions evaluate to React elements, which can't survive rehypeRaw's
 * `structuredClone` passthrough — so the handler stored a clone-safe sentinel
 * (`{ __mdxishJsxExprSource__: source }`) instead. Now that we're past the clone,
 * evaluate each sentinel with a scope of `{ React, ...mdxishScope }` and replace it
 * with the real value (e.g. an array of objects whose fields are React elements).
 *
 * Must run after `rehypeRaw` and `normalizeMdxJsxNodes` (so the sentinels live on
 * standard `element` nodes). Skipped in safeMode, which keeps expressions literal.
 */
const resolveJsxAttributeExpressionProps: Plugin<[], Root> = () => (tree, file: VFile) => {
  const scope: Record<string, unknown> = { ...file.data.mdxishScope, React };

  visit(tree, 'element', (node: Element) => {
    const properties: Record<string, unknown> = node.properties;

    Object.entries(properties).forEach(([name, value]) => {
      if (!isJsxExprSentinel(value)) return;

      const source = getJsxExprSource(value);
      try {
        properties[name] = evalJsxExpression(source, scope);
      } catch {
        // Evaluation failed — fall back to the raw expression source so the
        // attribute renders as readable text rather than disappearing.
        properties[name] = source;
      }
    });
  });

  return tree;
};

export default resolveJsxAttributeExpressionProps;
