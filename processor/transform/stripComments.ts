import type { Root } from 'mdast';

import { visit, SKIP } from 'unist-util-visit';

const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;
// Indented whole-line comment plus trailing newline; removing the whole line
// avoids leaving a whitespace-only line that terminates the surrounding block.
const WHOLE_LINE_HTML_COMMENT_REGEX = /^[ \t]+<!--[\s\S]*?-->[ \t]*(?:\r?\n|$)/gm;
export const MDX_COMMENT_REGEX = /\/\*(?:(?!\*\/)[\s\S])*\*\//g;

/**
 * A remark plugin to remove comments from Markdown and MDX.
 */
export const stripCommentsTransformer = () => {
  return (tree: Root) => {
    visit(tree, ['html', 'mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
      if (parent && typeof index === 'number') {
        // Remove HTML comments
        if (node.type === 'html' && HTML_COMMENT_REGEX.test(node.value)) {
          const newValue = node.value
            .replace(WHOLE_LINE_HTML_COMMENT_REGEX, '')
            .replace(HTML_COMMENT_REGEX, '')
            .trim();
          if (newValue) {
            node.value = newValue;
          } else {
            parent.children.splice(index, 1);
            return [SKIP, index];
          }
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
