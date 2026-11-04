import type { Root } from 'mdast';

import { visit, SKIP } from 'unist-util-visit';

// Removing one comment can assemble another (`<!<!-- a -->-- b -->`). Track the
// earliest `<!--` and cut through its `-->` so each character is copied once.
const stripHtmlComments = (value: string): string => {
  const buf: string[] = [];
  let openAt = -1;

  for (let i = 0; i < value.length; i += 1) {
    buf.push(value[i]);
    const end = buf.length;
    if (
      openAt === -1 &&
      end >= 4 &&
      buf[end - 4] === '<' &&
      buf[end - 3] === '!' &&
      buf[end - 2] === '-' &&
      buf[end - 1] === '-'
    ) {
      openAt = end - 4;
    }
    if (openAt !== -1 && end >= openAt + 7 && buf[end - 3] === '-' && buf[end - 2] === '-' && buf[end - 1] === '>') {
      buf.length = openAt;
      openAt = -1;
    }
  }

  return buf.join('');
};

export const MDX_COMMENT_REGEX = /\/\*(?:(?!\*\/)[\s\S])*\*\//g;
// A backtick run up to its partner of the same size, as CommonMark reads a code span.
const CODE_SPAN_REGEX = /(`+)[\s\S]*?\1/;
// `{/* … */}`, with any space allowed inside the braces.
const COMMENT_EXPRESSION_REGEX = new RegExp(`\\{\\s*${MDX_COMMENT_REGEX.source}\\s*\\}`);
const CODE_SPAN_OR_COMMENT_EXPRESSION_REGEX = new RegExp(
  `${CODE_SPAN_REGEX.source}|${COMMENT_EXPRESSION_REGEX.source}`,
  'g',
);

// A tokenized tag (`<NoTranslate>`) holds its `{/* … */}` as html text, so the expression visitor never sees it.
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
        // Remove HTML comments. Leave the node untouched when nothing matched so a
        // tokenized tag still gets its `{/* … */}` expressions stripped below.
        if (node.type === 'html') {
          const stripped = stripHtmlComments(node.value);
          if (stripped !== node.value) {
            const newValue = stripped.trim();
            if (newValue) {
              node.value = newValue;
            } else {
              parent.children.splice(index, 1);
              return [SKIP, index];
            }
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
    });
  };
};
