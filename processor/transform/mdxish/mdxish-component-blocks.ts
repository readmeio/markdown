import type { Node, Parent, Paragraph, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

const tagPattern = /^<([A-Z][A-Za-z0-9_]*)([^>]*?)(\/?)>([\s\S]*)?$/;
const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

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

  attributePattern.lastIndex = 0;
  let match: RegExpExecArray | null = attributePattern.exec(attrString);
  while (match !== null) {
    const [, attrName, attrValue] = match;
    const value = attrValue ? attrValue.replace(/^['"]|['"]$/g, '') : null;
    attributes.push({ type: 'mdxJsxAttribute', name: attrName, value });
    match = attributePattern.exec(attrString);
  }

  return attributes;
};

/**
 * Parse an HTML tag string into structured data.
 */
const parseTag = (value: string) => {
  const match = value.match(tagPattern);
  if (!match) return null;

  const [, tag, attrString = '', selfClosing = '', content = ''] = match;
  return {
    tag,
    attributes: parseAttributes(attrString),
    selfClosing: !!selfClosing,
    content,
  };
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
 * Find the index of a closing tag among sibling nodes.
 * Returns -1 if not found.
 */
const findClosingTagIndex = (parent: Parent, startIndex: number, tag: string): number =>
  parent.children.findIndex(
    (child, idx) => idx > startIndex && child.type === 'html' && isClosingTag((child as { value?: string }).value || '', tag),
  );

/**
 * Remove a closing tag from a paragraph's children and return the updated paragraph.
 */
const stripClosingFromParagraph = (node: Paragraph, tag: string) => {
  if (!Array.isArray(node.children)) return { paragraph: node, found: false } as const;

  const children = [...node.children];
  const closingIndex = children.findIndex(
    child => child.type === 'html' && isClosingTag((child as { value?: string }).value || '', tag),
  );
  if (closingIndex === -1) return { paragraph: node, found: false } as const;

  children.splice(closingIndex, 1);
  return { paragraph: { ...node, children }, found: true } as const;
};

/**
 * Transform PascalCase HTML blocks into mdxJsxFlowElement nodes.
 *
 * Remark parses unknown/custom component tags as raw HTML nodes.
 * These are the custom readme MDX syntax for components.
 * This transformer identifies these patterns and converts them to proper MDX JSX elements so they
 * can be rendered with their component definition code.
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
 * <Component>
 *   <h2>Title</h2>
 *   <p>Content</p>
 * </Component>
 * ```
 * Parsed as: `html: "<Component>\n  <h2>Title</h2>\n  <p>Content</p>\n</Component>"`
 * The opening tag, content, and closing tag are all captured in one HTML node.
 *
 * ### 3. Inline components (opening/closing tags as siblings in same paragraph)
 * ```
 * <Button>Click me</Button>
 * ```
 * Parsed as:
 * ```
 * paragraph
 *   html: "<Button>"
 *   text: "Click me"
 *   html: "</Button>"
 * ```
 *
 * ### 4. Block components (opening tag followed by paragraph with closing tag)
 * ```
 * <Callout>
 * Some **markdown** content
 * </Callout>
 * ```
 * Parsed as:
 * ```
 * html: "<Callout>"
 * paragraph
 *   text: "Some "
 *   strong: "markdown"
 *   text: " content"
 *   html: "</Callout>"
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

    const value = (node as { value?: string }).value;
    if (node.type !== 'html' || typeof value !== 'string') return;

    const parsed = parseTag(value);
    if (!parsed) return;

    const { tag, attributes, selfClosing, content = '' } = parsed;
    const closingTagStr = `</${tag}>`;

    // Case 1: Self-closing tag
    if (selfClosing) {
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: [],
        startPosition: node.position,
      });
      (parent.children as Node[]).splice(index, 1, componentNode as Node);
      return;
    }

    // Case 2: Self-contained block (closing tag in content)
    if (content.includes(closingTagStr)) {
      const innerContent = content.substring(0, content.lastIndexOf(closingTagStr)).trim();
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: innerContent ? (parseMdChildren(innerContent) as MdxJsxFlowElement['children']) : [],
        startPosition: node.position,
      });
      (parent.children as Node[]).splice(index, 1, componentNode as Node);
      return;
    }

    // Case 3: Inline component (closing tag is sibling in same parent)
    const closingIdx = findClosingTagIndex(parent, index, tag);
    if (closingIdx !== -1) {
      const siblingChildren = parent.children.slice(index + 1, closingIdx) as MdxJsxFlowElement['children'];
      const extraChildren = content ? (parseMdChildren(content.trimStart()) as MdxJsxFlowElement['children']) : [];
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: [...extraChildren, ...siblingChildren],
        startPosition: node.position,
        endPosition: parent.children[closingIdx]?.position,
      });
      (parent.children as Node[]).splice(index, closingIdx - index + 1, componentNode as Node);
      return;
    }

    // Case 4: Block component (closing tag in next sibling paragraph)
    const next = parent.children[index + 1];
    if (!next || next.type !== 'paragraph') return;

    const { paragraph, found } = stripClosingFromParagraph(next as Paragraph, tag);
    if (!found) return;

    const extraChildren = content ? (parseMdChildren(content.trimStart()) as MdxJsxFlowElement['children']) : [];
    const componentNode = createComponentNode({
      tag,
      attributes,
      children: [...extraChildren, ...(paragraph.children as MdxJsxFlowElement['children'])],
      startPosition: node.position,
      endPosition: next.position,
    });
    (parent.children as Node[]).splice(index, 2, componentNode as Node);
  };

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
