import type { Element, ElementContent, Root } from 'hast';
import type { VFile } from 'vfile';

import GithubSlugger from 'github-slugger';
import { visit } from 'unist-util-visit';

function isHeading(node: Element) {
  return /^h[1-6]$/.test(node.tagName);
}

function textContent(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  // Process variable nodes by using their variable name for the id generation
  if (node.type === 'element' && node.tagName === 'variable' && node.properties?.name) {
    if (node.properties.isLegacy) {
      return node.properties.name as string;
    }
    return `user.${node.properties.name}`;
  }
  if ('children' in node) return node.children.map(textContent).join('');
  return '';
}

/**
 * Rehype plugin that constructs ids for headings
 * Id's are used to construct slug anchor links & Table of Contents during rendering
 * Use the text / nodes that make up the heading to generate the id
 */
const generateSlugForHeadings = () => (tree: Root, file: VFile) => {
  const slugger = new GithubSlugger();
  // The slugger only counts the ids it generates, so `{#id}` ones are skipped past by hand.
  const explicitIds = file.data.explicitHeadingIds ?? new Set<string>();

  visit(tree, 'element', (node: Element) => {
    if (isHeading(node) && !node.properties.id) {
      const text = node.children.map(textContent).join('');
      let id = slugger.slug(text);
      while (explicitIds.has(id)) id = slugger.slug(text);
      node.properties.id = id;
    }
  });

  return tree;
};

export default generateSlugForHeadings;
