import type { Element, ElementContent, Root } from 'hast';

import GithubSlugger from 'github-slugger';
import { visit } from 'unist-util-visit';

function isHeading(node: Element) {
  return /^h[1-6]$/.test(node.tagName);
}

function textContent(node: ElementContent): string {
  if (node.type === 'text') return node.value;
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
 * Rehype plugin that adds constructs ids for headings
 * Id's are needed to construct slug anchor links & Table of Contents later on
 * Uses variable names for the id if available
 */
const generateSlugForHeadings = () => (tree: Root) => {
  const slugger = new GithubSlugger();

  visit(tree, 'element', (node: Element) => {
    if (isHeading(node) && !node.properties.id) {
      const text = node.children.map(textContent).join('');
      node.properties.id = slugger.slug(text);
    }
  });

  return tree;
};

export default generateSlugForHeadings;