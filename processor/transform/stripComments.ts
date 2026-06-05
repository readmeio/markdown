import type { Root } from 'mdast';

import { visit, SKIP } from 'unist-util-visit';

const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;
export const MDX_COMMENT_REGEX = /\/\*(?:(?!\*\/)[\s\S])*\*\//g;
// Matches `<HTMLBlock …>{`…`}</HTMLBlock>` template literal expressions
const HTMLBLOCK_RE = /<HTMLBlock\b[^>]*>\s*\{\s*`(?:[^`\\]|\\.)*`\s*\}\s*<\/HTMLBlock>/g;

function stripHtmlCommentsPreservingHtmlBlocks(value: string): string {
  const placeholders: string[] = [];
  const withPlaceholders = value.replace(HTMLBLOCK_RE, match => {
    placeholders.push(match);
    return `__HTMLBLOCK_${placeholders.length - 1}__`;
  });
  const stripped = withPlaceholders.replace(HTML_COMMENT_REGEX, '').trim();
  return stripped.replace(/__HTMLBLOCK_(\d+)__/g, (_, i) => placeholders[parseInt(i, 10)]);
}

/**
 * A remark plugin to remove comments from Markdown and MDX.
 */
export const stripCommentsTransformer = () => {
  return (tree: Root) => {
    visit(tree, ['html', 'mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
      if (parent && typeof index === 'number') {
        // Remove HTML comments
        if (node.type === 'html' && HTML_COMMENT_REGEX.test(node.value)) {
          const newValue = stripHtmlCommentsPreservingHtmlBlocks(node.value);
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
