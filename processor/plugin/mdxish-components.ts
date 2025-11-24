import type { CustomComponents } from '../../types';
import type { Root, Element, ElementContent } from 'hast';
import type { Transformer } from 'unified';
import type { VFile } from 'vfile';

import { visit } from 'unist-util-visit';

import { componentExists } from '../../lib/utils/mix-components';

interface Options {
  components: CustomComponents;
  processMarkdown: (markdownContent: string) => Promise<Root>;
}

type RootChild = Root['children'][number];

function isElementContentNode(node: RootChild): node is ElementContent {
  return node.type === 'element' || node.type === 'text' || node.type === 'comment';
}

const replaceTextChildrenWithFragment = async (
  node: Element,
  processMarkdown: (markdownContent: string) => Promise<Root>,
) => {
  if (!node.children || node.children.length === 0) return;

  const nextChildren = await Promise.all(
    node.children.map(async child => {
      if (child.type !== 'text' || child.value.trim() === '') {
        return child;
      }

      const mdHast = await processMarkdown(child.value.trim());
      const fragmentChildren = (mdHast.children ?? []).filter(isElementContentNode);

      if (fragmentChildren.length === 0) {
        return child;
      }

      const wrapper: Element = {
        type: 'element',
        tagName: 'span',
        properties: { 'data-mdxish-text-node': true },
        children: fragmentChildren,
      };

      return wrapper;
    }),
  );

  node.children = nextChildren as Element['children'];
};


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

export const rehypeMdxishComponents = ({
  components,
  processMarkdown,
}: Options): Transformer<Root, Root> => {
  return async (tree: Root, vfile: VFile) => {
    const transforms: Promise<void>[] = [];

    // Visit all elements in the HAST looking for custom component tags
    visit(tree, 'element', (node: Element, index, parent: Element | Root) => {
      if (index === undefined || !parent) return;

      // Check if the node is an actual HTML tag
      // This is a hack since tags are normalized to lowercase by the parser, so we need to check the original string
      // for PascalCase tags & potentially custom component
      const originalStringHtml = vfile.toString().substring(node.position.start.offset, node.position.end.offset);
      if (isActualHtmlTag(node.tagName, originalStringHtml)) {
        return;
      }

      // Only process tags that have a corresponding component in the components hash
      const componentName = componentExists(node.tagName, components);
      if (!componentName) {
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

      // If we're in a custom component node, we want to transform the node by doing the following:
      // 1. Update the node.tagName to the actual component name in PascalCase
      // 2. For any text nodes inside the node, recursively process them as markdown & replace the text nodes with the processed markdown

      // Update the node.tagName to the actual component name in PascalCase
      node.tagName = componentName;

      // For any text nodes inside the current node,
      // recursively call processMarkdown on the text node's value
      // then, replace the text node with the hast node returned from processMarkdown
      transforms.push(replaceTextChildrenWithFragment(node, processMarkdown));
    });

    await Promise.all(transforms);
  };
};

