import type { ComponentNameMapping } from '../../../lib/utils/mdxish/preprocessComponentNames';
import type { Parent } from 'mdast';
import type { Html } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { restoreComponentName } from '../../../lib/utils/mdxish/preprocessComponentNames';

interface Options {
  mapping: ComponentNameMapping;
}

/**
 * Unified/remark plugin that restores original component names with underscores.
 *
 * CONTEXT:
 * This plugin runs AFTER mdxishComponentBlocks has converted HTML nodes into
 * mdxJsxFlowElement nodes. At this point, the AST contains nodes with placeholder
 * names like `RdmxSnakeCase0` instead of the original `Snake_case`.
 *
 * WHAT IT DOES:
 * 1. Visits all mdxJsxFlowElement nodes and restores their original names
 * 2. Also checks raw HTML nodes (in case some weren't converted) and restores names there
 *
 * EXAMPLE:
 * Input AST:  { type: 'mdxJsxFlowElement', name: 'RdmxSnakeCase0', ... }
 * Output AST: { type: 'mdxJsxFlowElement', name: 'Snake_case', ... }
 *
 * This ensures that when rehypeMdxishComponents runs later, it sees the correct
 * component name and can match it against the components hash.
 */
const restoreComponentNames: Plugin<[Options], Parent> = (options: Options) => {
  const { mapping } = options;

  return tree => {
    // Skip if no snake_case components were found during preprocessing
    if (!mapping || Object.keys(mapping).length === 0) {
      return tree;
    }

    // Restore names in mdxJsxFlowElement nodes
    visit(tree, 'mdxJsxFlowElement', (node: MdxJsxFlowElement) => {
      if (node.name) {
        node.name = restoreComponentName(node.name, mapping);
      }
    });

    // Restore names in raw HTML nodes
    visit(tree, 'html', (node: Html) => {
      if (node.value) {
        // Restore placeholders in raw HTML strings
        // This handles cases where mdxishComponentBlocks didn't convert the node yet
        // (e.g., inline components or complex nested structures)
        let newValue = node.value;
        Object.entries(mapping).forEach(([placeholder, original]) => {
          // Match the placeholder in opening tags, closing tags, and self-closing tags
          // Pattern: <placeholder, </placeholder, <placeholder/>, <placeholder attr="value">
          // Use case-insensitive flag 'i' because HTML parsers may normalize to lowercase
          const regex = new RegExp(`(<\\/?)(${placeholder})(\\s|\\/?>)`, 'gi');
          newValue = newValue.replace(regex, `$1${original}$3`);
        });

        if (newValue !== node.value) {
          // Debug logging disabled for production
          // console.log(`[restoreComponentNames] Restored HTML node: "${node.value}" → "${newValue}"`);
          node.value = newValue;
        }
      }
    });

    return tree;
  };
};

export default restoreComponentNames;
