import type { Element, ElementContent, Root } from 'hast';

import GithubSlugger, { slug } from 'github-slugger';
import { visit } from 'unist-util-visit';

function isHeading(node: Element) {
  return /^h[1-6]$/.test(node.tagName);
}

function isVariable(node: ElementContent): node is Element {
  return node.type === 'element' && /^variable$/i.test(node.tagName) && !!node.properties?.name;
}

function variableName(node: Element): string {
  if (node.properties.isLegacy) {
    return node.properties.name as string;
  }
  return `user.${node.properties.name}`;
}

function textContent(node: ElementContent, includeVariables: boolean): string {
  if (node.type === 'text') return node.value;
  // Variables are excluded from ids so anchors stay stable across users;
  // their names are only used as a fallback when the heading has no other text
  if (isVariable(node)) {
    return includeVariables ? variableName(node) : '';
  }
  if ('children' in node) return node.children.map(child => textContent(child, includeVariables)).join('');
  return '';
}

/**
 * Rehype plugin that constructs ids for headings
 * Id's are used to construct slug anchor links & Table of Contents during rendering
 * Use the text / nodes that make up the heading to generate the id
 */
const generateSlugForHeadings = () => (tree: Root) => {
  const slugger = new GithubSlugger();

  visit(tree, 'element', (node: Element) => {
    if (isHeading(node) && !node.properties.id) {
      let text = node.children.map(child => textContent(child, false)).join('');
      // Headings made up entirely of variables would get an empty id — fall
      // back to the variable names so their anchors remain usable
      if (slug(text) === '') {
        text = node.children.map(child => textContent(child, true)).join('');
      }
      node.properties.id = slugger.slug(text);
    }
  });

  return tree;
};

export default generateSlugForHeadings;
