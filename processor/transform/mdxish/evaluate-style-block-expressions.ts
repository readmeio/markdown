import type { Html, Root } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import React from 'react';
import { visit } from 'unist-util-visit';

import { evalExpression } from '../../../lib/utils/mdxish/mdxish-expression';

// Matches a standalone `<style ...>{ <expr> }</style>` block — the JSX shape MDX evaluates
// (typically a template-literal-wrapped CSS string) but which mdxish otherwise leaves as
// literal, invalid-CSS text (see CX-3646).
const STYLE_EXPRESSION_RE = /^(<style\b[^>]*>)\s*\{([\s\S]*)\}\s*(<\/style>)$/i;

/**
 * Evaluate the JSX expression wrapping a `<style>` tag's contents (typically a template
 * literal, e.g. `<style>{\`.foo { color: red; }\`}</style>`) so the tag ends up holding plain
 * CSS text instead of the literal `{`...`}` wrapper — which the browser treats as invalid CSS
 * and drops the entire stylesheet for.
 *
 * `<style>` is one of CommonMark's "raw text" HTML elements (along with script/pre/textarea):
 * its contents are captured verbatim as a single `html` mdast node with no inner tokenization,
 * so this expression never reaches the mdxFlowExpression tokenizer or `evaluateExpressions` —
 * it has to be matched and evaluated directly against the raw node's string value.
 *
 * Must run after `evaluateExports` (needs `file.data.mdxishScope`) and before `remarkRehype`
 * turns `html` mdast nodes into raw hast strings. Skipped in safeMode.
 */
const evaluateStyleBlockExpressions: Plugin<[], Root> = () => (tree, file: VFile) => {
  const scope: Record<string, unknown> = { ...file.data.mdxishScope, React };

  visit(tree, 'html', (node: Html) => {
    const match = node.value.trim().match(STYLE_EXPRESSION_RE);
    if (!match) return;

    const [, openTag, expression, closeTag] = match;
    try {
      const css = evalExpression(expression, scope);
      node.value = `${openTag}${String(css)}${closeTag}`;
    } catch {
      // Evaluation failed — leave the node untouched so it round-trips as literal text.
    }
  });

  return tree;
};

export default evaluateStyleBlockExpressions;
