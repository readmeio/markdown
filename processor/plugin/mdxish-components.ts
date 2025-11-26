import type { CustomComponents } from '../../types';
import type { Root, Element, ElementContent } from 'hast';
import type { Transformer } from 'unified';
import type { VFile } from 'vfile';

import { visit } from 'unist-util-visit';

import { componentExists } from '../../lib/utils/mix-components';

interface Options {
  components: CustomComponents;
  processMarkdown: (markdownContent: string) => Root;
}

type RootChild = Root['children'][number];

function isElementContentNode(node: RootChild): node is ElementContent {
  return node.type === 'element' || node.type === 'text' || node.type === 'comment';
}

// Check if there's no markdown content to be rendered
function isSingleParagraphTextNode(nodes: ElementContent[]) {
  if (
    nodes.length === 1 &&
    nodes[0].type === 'element' &&
    nodes[0].tagName === 'p' &&
    nodes[0].children &&
    nodes[0].children.every(grandchild => grandchild.type === 'text')
  ) {
    return true;
  }
  return false;
}

// Parse text children of a node and replace them with the processed markdown
const parseTextChildren = (node: Element, processMarkdown: (markdownContent: string) => Root) => {
  if (!node.children || node.children.length === 0) return;

  const nextChildren: Element['children'] = [];

  node.children.forEach(child => {
    // Non-text nodes are already processed and should be kept as is
    // Just readd them to the children array
    if (child.type !== 'text' || child.value.trim() === '') {
      nextChildren.push(child);
      return;
    }

    const mdHast = processMarkdown(child.value.trim());
    const fragmentChildren = (mdHast.children ?? []).filter(isElementContentNode);

    // If the processed markdown is just a single paragraph containing only text nodes,
    // retain the original text node to avoid block-level behavior
    // This happens when plain text gets wrapped in <p> by the markdown parser
    // Specific case for anchor tags because they are inline elements
    if ((node.tagName.toLowerCase() === 'anchor' || node.tagName.toLowerCase() === 'glossary') && isSingleParagraphTextNode(fragmentChildren)) {
      nextChildren.push(child);
      return;
    }

    nextChildren.push(...fragmentChildren);
  });

  node.children = nextChildren;
};

/**
 * Helper to intelligently convert lowercase compound words to camelCase
 * e.g., "iconcolor" -> "iconColor", "backgroundcolor" -> "backgroundColor"
 */
function smartCamelCase(str: string): string {
  // If it has hyphens, convert kebab-case to camelCase
  if (str.includes('-')) {
    return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
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

// Standard HTML tags that should never be treated as custom components
const STANDARD_HTML_TAGS = new Set([
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'menu',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
]);

function isActualHtmlTag(nodeTagName: string, originalExcerpt: string) {
  // If it's a standard HTML tag, always treat it as HTML
  if (STANDARD_HTML_TAGS.has(nodeTagName.toLowerCase())) {
    return true;
  }

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

export const rehypeMdxishComponents = ({ components, processMarkdown }: Options): Transformer<Root, Root> => {
  return (tree: Root, vfile: VFile) => {
    // Collect nodes to remove (non-existent components)
    // We collect first, then remove in reverse order to avoid index shifting issues
    const nodesToRemove: { index: number; parent: Element | Root }[] = [];

    // Visit all elements in the HAST looking for custom component tags
    visit(tree, 'element', (node: Element, index, parent: Element | Root) => {
      if (index === undefined || !parent) return;

      // Check if the node is an actual HTML tag
      if (STANDARD_HTML_TAGS.has(node.tagName.toLowerCase())) {
        return;
      }

      // This is a hack since tags are normalized to lowercase by the parser, so we need to check the original string
      // for PascalCase tags & potentially custom component
      // Note: node.position may be undefined for programmatically created nodes
      if (node.position?.start && node.position?.end) {
        const originalStringHtml = vfile.toString().substring(node.position.start.offset, node.position.end.offset);
        if (isActualHtmlTag(node.tagName, originalStringHtml)) {
          return;
        }
      }

      // Only process tags that have a corresponding component in the components hash
      const componentName = componentExists(node.tagName, components);
      if (!componentName) {
        // Mark non-existent component nodes for removal
        // This mimics handle-missing-components.ts behavior
        nodesToRemove.push({ index, parent });
        return;
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

      parseTextChildren(node, processMarkdown);
    });

    // Remove non-existent component nodes in reverse order to maintain correct indices
    for (let i = nodesToRemove.length - 1; i >= 0; i -= 1) {
      const { parent, index } = nodesToRemove[i];
      console.log('Removing node:', (parent.children[index] as Element).tagName);
      parent.children.splice(index, 1);
    }
  };
};
