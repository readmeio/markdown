import type { Element, Root } from 'hast';
import type { Transformer } from 'unified';

import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that converts empty `<p>` elements into `<br>` elements.
 *
 * Empty paragraphs are inserted by `remarkRestoreBlankLines` to preserve
 * vertical spacing from blank lines in the source markdown. After
 * `remarkRehype` converts them to `<p></p>`, they render as invisible
 * because empty block elements have no content height and their margins
 * collapse. This plugin replaces them with `<br>` elements so the spacing
 * is visible in the rendered output.
 */
export const rehypeEmptyParagraphsToBr = (): Transformer<Root, Root> => {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (index === undefined || !parent) return;
      if (node.tagName !== 'p') return;

      if (node.children.length === 0) {
        parent.children[index] = {
          type: 'element',
          tagName: 'br',
          properties: {},
          children: [],
        };
      }
    });
  };
};
