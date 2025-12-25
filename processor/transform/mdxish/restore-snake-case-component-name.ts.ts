import type { SnakeCaseMapping } from './mdxish-snake-case-components';
import type { Parent, Html } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { restoreSnakeCase } from './mdxish-snake-case-components';

interface Options {
  mapping: SnakeCaseMapping;
}

/**
 * Restores snake_case component names from placeholders after parsing.
 * Runs after mdxishComponentBlocks converts HTML nodes to mdxJsxFlowElement.
 */
const restoreSnakeCaseComponentNames: Plugin<[Options], Parent> = (options: Options) => {
  const { mapping } = options;

  return tree => {
    if (!mapping || Object.keys(mapping).length === 0) {
      return tree;
    }

    visit(tree, 'mdxJsxFlowElement', (node: MdxJsxFlowElement) => {
      if (node.name) {
        node.name = restoreSnakeCase(node.name, mapping);
      }
    });

    // Pre-compile regex patterns for better performance
    const regexPatterns = Object.entries(mapping).map(([placeholder, original]) => ({
      regex: new RegExp(`(<\\/?)(${placeholder})(\\s|\\/?>)`, 'gi'),
      original,
    }));

    visit(tree, 'html', (node: Html) => {
      if (node.value) {
        let newValue = node.value;
        
        regexPatterns.forEach(({ regex, original }) => {
          newValue = newValue.replace(regex, `$1${original}$3`);
        });

        if (newValue !== node.value) {
          node.value = newValue;
        }
      }
    });

    return tree;
  };
};

export default restoreSnakeCaseComponentNames;
