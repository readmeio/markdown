import type { Element } from 'hast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

// Private Use Area character (U+E000) which is extremely unlikely to appear in real content.
// Try to create a temporary string that is unlikely to appear in real content.
const BOOLEAN_SENTINEL = 'this-is-a-temporary-boolean-attribute-\uE000';

/**
 * Preserves boolean properties when passed to rehypeRaw.
 * Which converts boolean properties in nodes to empty strings since that's how HTML does it.
 */
const preserveBooleanProperties: Plugin = () => tree => {
  visit(tree, 'element', (node: Element) => {
    if (!node.properties) return;
    Object.entries(node.properties).forEach(([key, value]) => {
      if (value === true) {
        node.properties[key] = BOOLEAN_SENTINEL;
      }
    });
  });

  return tree;
};

const restoreBooleanProperties: Plugin = () => tree => {
  visit(tree, 'element', (node: Element) => {
    if (!node.properties) return;
    Object.entries(node.properties).forEach(([key, value]) => {
      if (value === BOOLEAN_SENTINEL) {
        node.properties[key] = true;
      }
    });
  });

  return tree;
};

export { preserveBooleanProperties, restoreBooleanProperties };