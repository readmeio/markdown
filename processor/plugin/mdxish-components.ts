import type { CustomComponents } from '../../types';
import type { Root, Element } from 'hast';
import type { Transformer } from 'unified';
import type { VFile } from 'vfile';

import { fromHtml } from 'hast-util-from-html';
import { visit } from 'unist-util-visit';

import { componentExists, serializeInnerHTML, renderComponent } from '../../lib/utils/mix-components';

interface Options {
  components: CustomComponents;
  processMarkdown: (content: string) => Promise<string>;
}

/**
 * Helper to intelligently convert lowercase compound words to camelCase
 * e.g., "iconcolor" -> "iconColor", "backgroundcolor" -> "backgroundColor"
 */
function smartCamelCase(str: string): string {
  // If it has hyphens, convert kebab-case to camelCase
  if (str.includes('-')) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  // Common word boundaries for CSS/React props
  const words = [
    'class',
    'icon',
    'background',
    'text',
    'font',
    'border',
    'max',
    'min',
    'color',
    'size',
    'width',
    'height',
    'style',
    'weight',
    'radius',
    'image',
    'data',
    'aria',
    'role',
    'tab',
    'index',
    'type',
    'name',
    'value',
    'id',
  ];

  // Try to split the string at known word boundaries
  return words.reduce((result, word) => {
    // Look for pattern: word + anotherword
    const regex = new RegExp(`(${word})([a-z])`, 'gi');
    return result.replace(regex, (_match, p1, p2) => {
      return p1.toLowerCase() + p2.toUpperCase();
    });
  }, str);
}

function isActualHtmlTag(nodeTagName: string, originalExcerpt: string) {
  if (originalExcerpt.startsWith(`<${nodeTagName}>`)) {
    return true;
  }

  // Add more cases of a character being converted to a tag
  switch (nodeTagName) {
    case 'code':
      return originalExcerpt.startsWith('`');
    default:
      return false;
  }
}

/**
 * Rehype plugin to dynamically transform ANY custom component elements
 */
export const rehypeMdxishComponents = ({ components, processMarkdown }: Options): Transformer<Root, Root> => {
  return async (tree: Root, vfile: VFile): Promise<void> => {
    const transformations: {
      componentName: string;
      index: number;
      node: Element;
      parent: Element | Root;
      props: Record<string, unknown>;
    }[] = [];

    // Visit all elements in the AST looking for custom component tags
    visit(tree, 'element', (node: Element, index, parent: Element | Root | undefined) => {
      if (index === undefined || !parent) return;

      // Check if the node is an actual HTML tag
      // This is a hack since tags are normalized to lowercase by the parser, so we need to check the original string
      // for PascalCase tags & potentially custom component
      const originalStringHtml = vfile.toString().substring(node.position.start.offset, node.position.end.offset);
      if (isActualHtmlTag(node.tagName, originalStringHtml)) {
        return;
      }

      // Only process tags that have a corresponding component in the components hash
      if (!componentExists(node.tagName, components)) {
        return; // Skip - non-existent component
      }

      // This is a custom component! Extract all properties dynamically
      const props: Record<string, unknown> = {};

      // Convert all properties from kebab-case/lowercase to camelCase
      if (node.properties) {
        Object.entries(node.properties).forEach(([key, value]) => {
          const camelKey = smartCamelCase(key);
          props[camelKey] = value;
        });
      }

      // Extract the inner HTML (preserving nested elements) for children prop
      const innerHTML = serializeInnerHTML(node);
      if (innerHTML.trim()) {
        props.children = innerHTML.trim();
      }

      // Store the transformation to process async
      transformations.push({
        componentName: node.tagName,
        node,
        index,
        parent,
        props,
      });
    });

    // Process all components sequentially to avoid index shifting issues
    // Process in reverse order so indices remain valid
    const reversedTransformations = [...transformations].reverse();
    await reversedTransformations.reduce(async (previousPromise, { componentName, index, parent, props }) => {
      await previousPromise;
      // Render any component dynamically
      const componentHTML = await renderComponent(componentName, props, components, processMarkdown);

      // Parse the rendered HTML back into HAST nodes
      const htmlTree = fromHtml(componentHTML, { fragment: true });

      // Replace the component node with the parsed HTML nodes
      if ('children' in parent && Array.isArray(parent.children)) {
        // Replace the single component node with the children from the parsed HTML
        parent.children.splice(index, 1, ...htmlTree.children);
      }
    }, Promise.resolve());
  };
};

