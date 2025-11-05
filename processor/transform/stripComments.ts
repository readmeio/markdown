import type { Root } from 'mdast';

import { visit, SKIP } from 'unist-util-visit';

/**
 * A remark plugin to remove comments from Markdown and MDX.
 */
export const stripCommentsTransformer = () => {
  return (tree: Root) => {
    visit(tree, ['html', 'mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
      if (parent && typeof index === 'number') {
        // Remove HTML comments
        if (node.type === 'html' && node.value.startsWith('<!--') && node.value.endsWith('-->')) {
          parent.children.splice(index, 1);
          return [SKIP, index];
        }

        // Remove MDX comments
        if (
          (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') &&
          /^\s*\/\*[\s\S]*?\*\/\s*$/.test(node.value)
        ) {
          parent.children.splice(index, 1);
          return [SKIP, index];
        }
      }
      
      return undefined;
    });
  };
};