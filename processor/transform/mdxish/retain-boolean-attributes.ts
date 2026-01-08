import type { Element } from 'hast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

// Private Use Area character (U+E000) which is extremely unlikely to appear in real content.
const TEMP_TRUE_BOOLEAN_VALUE = 'readme-this-is-a-temporary-boolean-attribute-\uE000'
const TEMP_FALSE_BOOLEAN_VALUE = 'readme-this-is-a-temporary-boolean-attribute-\uE001';

/**
 * Preserves boolean properties when passed to rehypeRaw because
 * rehypeRaw converts boolean properties in nodes to strings (e.g. true -> ""),
 * which can change the truthiness of the property. Hence we need to preserve the boolean properties.
 */
const preserveBooleanProperties: Plugin = () => tree => {
  visit(tree, 'element', (node: Element) => {
    if (!node.properties) return;
    Object.entries(node.properties).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        node.properties[key] = value ? TEMP_TRUE_BOOLEAN_VALUE : TEMP_FALSE_BOOLEAN_VALUE;
      }
    });
  });

  return tree;
};

const restoreBooleanProperties: Plugin = () => tree => {
  visit(tree, 'element', (node: Element) => {
    if (!node.properties) return;
    Object.entries(node.properties).forEach(([key, value]) => {
      if (value === TEMP_TRUE_BOOLEAN_VALUE) {
        node.properties[key] = true;
      } else if (value === TEMP_FALSE_BOOLEAN_VALUE) {
        node.properties[key] = false;
      }
    });
  });

  return tree;
};

export { preserveBooleanProperties, restoreBooleanProperties };
