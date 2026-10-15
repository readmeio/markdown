import type { Root } from 'mdast';

import { visit, SKIP } from 'unist-util-visit';

const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;
export const MDX_COMMENT_REGEX = /\/\*(?:(?!\*\/)[\s\S])*\*\//g;
// A backtick run up to its partner of the same size, as CommonMark reads a code span.
const CODE_SPAN_REGEX = /(`+)[\s\S]*?\1/;
// `{/* … */}`, with any space allowed inside the braces.
const COMMENT_EXPRESSION_REGEX = new RegExp(`\\{\\s*${MDX_COMMENT_REGEX.source}\\s*\\}`);
const CODE_SPAN_OR_COMMENT_EXPRESSION_REGEX = new RegExp(
  `${CODE_SPAN_REGEX.source}|${COMMENT_EXPRESSION_REGEX.source}`,
  'g',
);

// A tokenized tag (`<DNT>`) holds its `{/* … */}` as html text, so the expression visitor never sees it.
// The code span half matches first and is kept: a comment shown inside a code span is text.
const stripCommentExpressions = (value: string): string =>
  value.replace(CODE_SPAN_OR_COMMENT_EXPRESSION_REGEX, (match, ticks?: string) => (ticks ? match : ''));

/**
 * A remark plugin to remove comments from Markdown and MDX.
 */
export const stripCommentsTransformer = () => {
  return (tree: Root) => {
    visit(tree, ['html', 'mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
      if (parent && typeof index === 'number') {
        // Remove HTML comments
        if (node.type === 'html' && HTML_COMMENT_REGEX.test(node.value)) {
          const newValue = node.value.replace(HTML_COMMENT_REGEX, '').trim();
          if (newValue) {
            node.value = newValue;
          } else {
            parent.children.splice(index, 1);
            return [SKIP, index];
          }
        }

        if (node.type === 'html' && node.data?.tokenized) {
          node.value = stripCommentExpressions(node.value);
        }

        // Remove MDX comments
        if (
          (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') &&
          MDX_COMMENT_REGEX.test(node.value)
        ) {
          const newValue = node.value.replace(MDX_COMMENT_REGEX, '').trim();
          if (newValue) {
            node.value = newValue;
          } else {
            parent.children.splice(index, 1);
            return [SKIP, index];
          }
        }
      }

      return undefined;
    });
  };
};
