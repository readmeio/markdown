import type { Node, Parent, Paragraph, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

const pascalCaseTagPattern = /^<([A-Z][A-Za-z0-9_]*)([^>]*?)(\/?)>([\s\S]*)?$/;
const tagAttributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

/**
 * Maximum number of siblings to scan forward when looking for a closing tag
 * to avoid scanning too far and degrading performance
 */
const MAX_LOOKAHEAD = 30;

/**
 * Tags that have dedicated transformers and should NOT be handled by this plugin.
 * These components have special parsing requirements that the generic component
 * block transformer cannot handle correctly.
 */
const EXCLUDED_TAGS = new Set(['HTMLBlock', 'Table']);

const inlineMdProcessor = unified().use(remarkParse);

const isClosingTag = (value: string, tag: string) => value.trim() === `</${tag}>`;

/**
 * Parse markdown content into mdast children nodes.
 */
const parseMdChildren = (value: string): RootContent[] => {
  const parsed = inlineMdProcessor.parse(value);
  return parsed.children || [];
};

/**
 * Convert raw attribute string into mdxJsxAttribute entries.
 * Handles both key-value attributes (theme="info") and boolean attributes (empty).
 */
export const parseAttributes = (raw: string): MdxJsxAttribute[] => {
  const attributes: MdxJsxAttribute[] = [];
  const attrString = raw.trim();
  if (!attrString) return attributes;

  tagAttributePattern.lastIndex = 0;
  let match: RegExpExecArray | null = tagAttributePattern.exec(attrString);
  while (match !== null) {
    const [, attrName, attrValue] = match;
    const value = attrValue ? attrValue.replace(/^['"]|['"]$/g, '') : null;
    attributes.push({ type: 'mdxJsxAttribute', name: attrName, value });
    match = tagAttributePattern.exec(attrString);
  }

  return attributes;
};

/**
 * Parse an HTML tag string into structured data.
 */
const parseTag = (value: string) => {
  const match = value.match(pascalCaseTagPattern);
  if (!match) return null;

  const [, tag, attrString = '', selfClosing = '', contentAfterTag = ''] = match;
  return {
    tag,
    attributes: parseAttributes(attrString),
    selfClosing: !!selfClosing,
    contentAfterTag,
  };
};

const parseAndUpdateSiblings = (stack: Parent[], parent: Parent, index: number, content: string) => {
  const extraSiblings = parseMdChildren(content) as Node[];
  if (extraSiblings.length > 0) {
    (parent.children as Node[]).splice(index + 1, 0, ...extraSiblings);
    stack.push(parent);
  }
};

interface ComponentNodeOptions {
  attributes: MdxJsxAttribute[];
  children: MdxJsxFlowElement['children'];
  endPosition?: Node['position'];
  startPosition?: Node['position'];
  tag: string;
}

/**
 * Create an MdxJsxFlowElement node from component data.
 */
const createComponentNode = ({ tag, attributes, children, startPosition, endPosition }: ComponentNodeOptions): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: tag,
  attributes,
  children,
  position: {
    start: startPosition?.start,
    end: endPosition?.end ?? startPosition?.end,
  },
});

/**
 * Remove a closing tag from a paragraph's children and return the updated paragraph.
 */
const stripClosingTagFromParagraph = (node: Paragraph, tag: string) => {
  if (!Array.isArray(node.children)) return { paragraph: node, found: false } as const;

  const children = [...node.children];
  const closingIndex = children.findIndex(
    child => child.type === 'html' && isClosingTag((child as { value?: string }).value || '', tag),
  );
  if (closingIndex === -1) return { paragraph: node, found: false } as const;

  children.splice(closingIndex, 1);
  return { paragraph: { ...node, children }, found: true } as const;
};

interface ScanResult {
  /** Index of the sibling containing the closing tag */
  closingIndex: number;
  /** Additional children parsed from the closing sibling (content before closing tag in HTML blocks) */
  extraClosingChildren: MdxJsxFlowElement['children'];
  /** For paragraph siblings, the paragraph with closing tag stripped */
  strippedParagraph?: Paragraph;
}

/**
 * Scan forward through siblings to find a closing tag.
 * Handles:
 * - Exact match HTML siblings (e.g., `</Tag>`)
 * - HTML siblings with embedded closing tag (e.g., `...\n</Tag>`)
 * - Paragraph siblings containing the closing tag as a child
 *
 * Returns null if not found within MAX_LOOKAHEAD siblings
 */
const scanForClosingTag = (parent: Parent, startIndex: number, tag: string): ScanResult | null => {
  const closingTagStr = `</${tag}>`;
  const maxIndex = Math.min(startIndex + MAX_LOOKAHEAD, parent.children.length);

  let i = startIndex + 1;
  for (; i < maxIndex; i += 1) {
    const sibling = parent.children[i];

    // Check HTML siblings
    if (sibling.type === 'html') {
      const siblingValue = (sibling as { value?: string }).value || '';

      // Exact match (standalone closing tag)
      if (isClosingTag(siblingValue, tag)) {
        return { closingIndex: i, extraClosingChildren: [] };
      }

      // Embedded closing tag (closing tag at end of HTML block content)
      if (siblingValue.includes(closingTagStr)) {
        const contentBeforeClose = siblingValue.substring(0, siblingValue.lastIndexOf(closingTagStr)).trim();
        const extraChildren = contentBeforeClose
          ? (parseMdChildren(contentBeforeClose) as MdxJsxFlowElement['children'])
          : [];
        return { closingIndex: i, extraClosingChildren: extraChildren };
      }
    }

    // Check paragraph siblings
    if (sibling.type === 'paragraph') {
      const { paragraph, found } = stripClosingTagFromParagraph(sibling as Paragraph, tag);
      if (found) {
        return { closingIndex: i, extraClosingChildren: [], strippedParagraph: paragraph };
      }
    }
  }

  if (i < parent.children.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `Closing tag </${tag}> not found within ${MAX_LOOKAHEAD} siblings, stopping scan`,
    );
  }

  return null;
};

const substituteNodeWithMdxNode = (parent: Parent, index: number, mdxNode: MdxJsxFlowElement) => {
  (parent.children as Node[]).splice(index, 1, mdxNode);
};

/**
 * Transform PascalCase HTML nodes into mdxJsxFlowElement nodes.
 *
 * Remark parses unknown/custom component tags as raw HTML nodes.
 * These are the custom readme MDX syntax for components.
 * This transformer identifies these patterns and converts them to proper MDX JSX elements so they
 * can be accurately recognized and rendered later with their component definition code.
 * Though for some tags, we need to handle them specially
 *
 * ## Supported HTML Structures
 *
 * ### 1. Self-closing tags
 * ```
 * <Component />
 * ```
 * Parsed as: `html: "<Component />"`
 *
 * ### 2. Self-contained blocks (entire component in single HTML node)
 * ```
 * <Button>Click me</Button>
 * ```
 * ```
 * <Component>
 *   <h2>Title</h2>
 *   <p>Content</p>
 * </Component>
 * ```
 * Parsed as: `html: "<Component>\n  <h2>Title</h2>\n  <p>Content</p>\n</Component>"`
 * The opening tag, content, and closing tag are all captured in one HTML node.
 *
 * ### 3. Multi-sibling components (closing tag in a following sibling)
 * Handles various structures where the closing tag is in a later sibling, such as:
 *
 * #### 3a. Block components (closing tag in sibling paragraph)
 * ```
 * <Callout>
 * Some **markdown** content
 * </Callout>
 * ```
 *
 * #### 3b. Multi-paragraph components (closing tag several siblings away)
 * ```
 * <Callout>
 *
 * First paragraph
 *
 * Second paragraph
 * </Callout>
 * ```
 *
 * #### 3c. Nested components split by blank lines (closing tag embedded in HTML sibling)
 * ```
 * <Outer>
 *   <Inner>content</Inner>
 *
 *   <Inner>content</Inner>
 * </Outer>
 * ```
 */
const mdxishComponentBlocks: Plugin<[], Parent> = () => tree => {
  const stack: Parent[] = [tree];

  const processChildNode = (parent: Parent, index: number) => {
    const node = parent.children[index];
    if (!node) return;
    if ('children' in node && Array.isArray(node.children)) {
      stack.push(node as Parent);
    }

    // Only visit HTML nodes with an actual html tag
    const value = (node as { value?: string }).value;
    if (node.type !== 'html' || typeof value !== 'string') return;
    const parsed = parseTag(value.trim());
    if (!parsed) return;

    const { tag, attributes, selfClosing, contentAfterTag = '' } = parsed;

    // Skip tags that have dedicated transformers
    if (EXCLUDED_TAGS.has(tag)) return;

    const closingTagStr = `</${tag}>`;

    // Case 1: Self-closing tag
    if (selfClosing) {
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: [],
        startPosition: node.position,
      });
      substituteNodeWithMdxNode(parent, index, componentNode);

      // Check and parse if there's relevant content after the current closing tag
      const remainingContent = contentAfterTag.trim();
      if (remainingContent) {
        parseAndUpdateSiblings(stack, parent, index, remainingContent);
      }
      return;
    }

    // Case 2: Self-contained block (closing tag in content)
    if (contentAfterTag.includes(closingTagStr)) {
      // Find the first closing tag
      const closingTagIndex = contentAfterTag.indexOf(closingTagStr);
      const componentInnerContent = contentAfterTag.substring(0, closingTagIndex).trim();
      const contentAfterClose = contentAfterTag.substring(closingTagIndex + closingTagStr.length).trim();
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: componentInnerContent ? (parseMdChildren(componentInnerContent) as MdxJsxFlowElement['children']) : [],
        startPosition: node.position,
      });
      substituteNodeWithMdxNode(parent, index, componentNode);

      // Since the inner content might contain unparsed components, process it recursively
      if (componentNode.children.length > 0) {
        stack.push(componentNode as Parent);
      }

      // Check and parse if there's relevant content after the current closing tag
      if (contentAfterClose) {
        parseAndUpdateSiblings(stack, parent, index, contentAfterClose);
      }
      return;
    }

    // Case 3: Multi-sibling component (closing tag in a following sibling)
    // Scans forward through siblings to find closing tag in HTML or paragraph nodes
    const scanResult = scanForClosingTag(parent, index, tag);
    if (!scanResult) return;

    const { closingIndex, extraClosingChildren, strippedParagraph } = scanResult;
    const extraChildren = contentAfterTag ? (parseMdChildren(contentAfterTag.trimStart()) as MdxJsxFlowElement['children']) : [];

    // Collect all intermediate siblings between opening tag and closing tag
    const intermediateChildren = parent.children.slice(index + 1, closingIndex) as MdxJsxFlowElement['children'];

    // For paragraph siblings, include the paragraph's children (with closing tag stripped)
    // For HTML siblings, include any content parsed from before the closing tag
    const closingChildren = strippedParagraph
      ? (strippedParagraph.children as MdxJsxFlowElement['children'])
      : extraClosingChildren;

    const componentNode = createComponentNode({
      tag,
      attributes,
      children: [...extraChildren, ...intermediateChildren, ...closingChildren],
      startPosition: node.position,
      endPosition: parent.children[closingIndex]?.position,
    });
    // Remove all nodes from opening tag to closing tag (inclusive) and replace with component node
    (parent.children as Node[]).splice(index, closingIndex - index + 1, componentNode);
    // Since we might be merging sibling nodes together, unlike the other cases,
    // we need to process the children of the new node
    if (componentNode.children.length > 0) {
      stack.push(componentNode as Parent);
    }
  };

  // Process the nodes with the components depth-first to maintain the correct order of the nodes
  while (stack.length) {
    const parent = stack.pop();
    if (parent?.children) {
      parent.children.forEach((_child, index) => {
        processChildNode(parent, index);
      });
    }
  }

  return tree;
};

export default mdxishComponentBlocks;
