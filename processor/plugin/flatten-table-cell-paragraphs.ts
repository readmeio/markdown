import type { Element, ElementContent, Root } from 'hast';
import type { Transformer } from 'unified';

import { visit } from 'unist-util-visit';

/** List elements that cause margin issues when adjacent to paragraphs */
const LIST_ELEMENTS = new Set(['ul', 'ol']);

/**
 * Check if a child is a whitespace-only text node
 */
function isWhitespaceText(child: ElementContent): boolean {
  return child.type === 'text' && !child.value.trim();
}

/**
 * Check if a child is an element with the given tag name
 */
function isElementWithTag(child: ElementContent, tags: Set<string>): boolean {
  return child.type === 'element' && tags.has(child.tagName);
}

/**
 * Rehype plugin that flattens paragraph elements that are adjacent to lists in table cells.
 *
 * When markdown content is parsed inside JSX table cells, text before/after lists
 * gets wrapped in `<p>` tags. This causes unwanted spacing because both `<p>` and
 * list elements have margins.
 *
 * This plugin selectively unwraps only `<p>` elements that are immediately before
 * or after a list (`<ul>` or `<ol>`), preserving paragraphs in other contexts.
 */
export const rehypeFlattenTableCellParagraphs = (): Transformer<Root, Root> => {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      // Only process table cells
      if (node.tagName !== 'td' && node.tagName !== 'th') return;

      const children = node.children;
      const newChildren: ElementContent[] = [];

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        // If not a paragraph, keep as-is
        if (child.type !== 'element' || child.tagName !== 'p') {
          newChildren.push(child);
          continue;
        }

        // Check if this paragraph is adjacent to a list
        // Look at previous non-whitespace sibling
        let prevIndex = i - 1;
        while (prevIndex >= 0 && isWhitespaceText(children[prevIndex])) {
          prevIndex--;
        }
        const prevIsNewChild = newChildren.length > 0 && newChildren[newChildren.length - 1];
        const prevIsList =
          (prevIndex >= 0 && isElementWithTag(children[prevIndex], LIST_ELEMENTS)) ||
          (prevIsNewChild && prevIsNewChild.type === 'element' && LIST_ELEMENTS.has(prevIsNewChild.tagName));

        // Look at next non-whitespace sibling
        let nextIndex = i + 1;
        while (nextIndex < children.length && isWhitespaceText(children[nextIndex])) {
          nextIndex++;
        }
        const nextIsList = nextIndex < children.length && isElementWithTag(children[nextIndex], LIST_ELEMENTS);

        // If adjacent to a list, flatten the paragraph
        if (prevIsList || nextIsList) {
          newChildren.push(...child.children);
        } else {
          newChildren.push(child);
        }
      }

      node.children = newChildren;
    });
  };
};
