import type { CustomComponents } from '../../types';
import type { Root, Element, ElementContent } from 'hast';
import type { Transformer } from 'unified';
import type { VFile } from 'vfile';

import { visit } from 'unist-util-visit';

import { getComponentName } from '../../lib/utils/mdxish/mdxish-get-component-name';
import {
  CUSTOM_PROP_BOUNDARIES,
  CSS_STYLE_PROP_BOUNDARIES,
  REACT_HTML_PROP_BOUNDARIES,
  RUNTIME_COMPONENT_TAGS,
  STANDARD_HTML_TAGS,
} from '../../utils/common-html-words';

interface Options {
  components: CustomComponents;
  processMarkdown: (markdownContent: string) => Root;
}

const INLINE_COMPONENT_TAGS = new Set(['anchor', 'glossary']);

function isElementContentNode(node: Root['children'][number]): node is ElementContent {
  return node.type === 'element' || node.type === 'text' || node.type === 'comment';
}

/** Check if nodes represent a single paragraph with only text (no markdown formatting) */
function isSingleParagraphTextNode(nodes: ElementContent[]): boolean {
  return (
    nodes.length === 1 &&
    nodes[0].type === 'element' &&
    nodes[0].tagName === 'p' &&
    nodes[0].children?.every(child => child.type === 'text')
  );
}

/**
 * Convert lowercase compound words to camelCase using known word boundaries.
 * e.g., "iconcolor" → "iconColor", "background-color" → "backgroundColor"
 */
function smartCamelCase(str: string): string {
  if (str.includes('-')) {
    return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  }

  const allBoundaries = [...REACT_HTML_PROP_BOUNDARIES, ...CSS_STYLE_PROP_BOUNDARIES, ...CUSTOM_PROP_BOUNDARIES];

  // Return as-is if already a boundary word to avoid incorrect splitting
  if (allBoundaries.includes(str.toLowerCase())) {
    return str;
  }

  // Sort by length (longest first) to prevent shorter matches (e.g., "column" in "columns")
  const sortedBoundaries = [...allBoundaries].sort((a, b) => b.length - a.length);

  // Use case-sensitive matching ('g' not 'gi') so that once a letter is
  // capitalized by a longer boundary, shorter boundaries won't re-match it.
  // This prevents issues like 'iconcolor' becoming 'iconColOr' instead of 'iconColor'.
  return sortedBoundaries.reduce((res, word) => {
    const regex = new RegExp(`(${word})([a-z])`, 'g');
    return res.replace(regex, (_, prefix, nextChar) => prefix.toLowerCase() + nextChar.toUpperCase());
  }, str);
}

/** Check if a tag name represents actual HTML (not a custom component) */
function isActualHtmlTag(tagName: string, originalExcerpt: string): boolean {
  if (STANDARD_HTML_TAGS.has(tagName.toLowerCase())) return true;
  if (originalExcerpt.startsWith(`<${tagName}>`)) return true;
  if (tagName === 'code' && originalExcerpt.startsWith('`')) return true;
  return false;
}

/** Parse and replace text children with processed markdown */
function parseTextChildren(node: Element, processMarkdown: (content: string) => Root): void {
  if (!node.children?.length) return;

  node.children = node.children.flatMap(child => {
    if (child.type !== 'text' || !child.value.trim()) return [child];

    const hast = processMarkdown(child.value.trim());
    const children = (hast.children ?? []).filter(isElementContentNode);

    // For inline components, preserve plain text instead of wrapping in <p>
    if (INLINE_COMPONENT_TAGS.has(node.tagName.toLowerCase()) && isSingleParagraphTextNode(children)) {
      return [child];
    }

    return children;
  });
}

/** Convert node properties from kebab-case/lowercase to camelCase */
function normalizeProperties(node: Element): void {
  if (!node.properties) return;

  const normalized: Element['properties'] = {};
  Object.entries(node.properties).forEach(([key, value]) => {
    normalized[smartCamelCase(key)] = value;
  });
  node.properties = normalized;
}

/**
 * Identifies custom MDX components and recursively parses markdown children.
 * Replaces tagName with PascalCase component name for React component resolution.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 * @param {Options} options - Configuration options
 * @param {CustomComponents} options.components - Available custom components
 * @param {Function} options.processMarkdown - Function to process markdown content
 * @returns {Transformer<Root, Root>} The transformer function
 */
export const rehypeMdxishComponents = ({ components, processMarkdown }: Options): Transformer<Root, Root> => {
  return (tree: Root, vfile: VFile) => {
    const nodesToRemove: { index: number; parent: Element | Root }[] = [];

    visit(tree, 'element', (node: Element, index, parent: Element | Root) => {
      if (index === undefined || !parent) return;

      // Skip runtime components and standard HTML tags
      if (RUNTIME_COMPONENT_TAGS.has(node.tagName)) return;

      if (STANDARD_HTML_TAGS.has(node.tagName.toLowerCase())) return;

      // Check original source for PascalCase tags (parser normalizes to lowercase)
      if (node.position?.start && node.position?.end) {
        const original = vfile.toString().substring(node.position.start.offset, node.position.end.offset);
        if (isActualHtmlTag(node.tagName, original)) return;
      }

      const componentName = getComponentName(node.tagName, components);
      if (!componentName) {
        nodesToRemove.push({ index, parent });
        return;
      }

      node.tagName = componentName;
      normalizeProperties(node);
      parseTextChildren(node, processMarkdown);
    });

    // Remove unknown components in reverse order to preserve indices
    for (let i = nodesToRemove.length - 1; i >= 0; i -= 1) {
      const { parent, index } = nodesToRemove[i];
      parent.children.splice(index, 1);
    }
  };
};
