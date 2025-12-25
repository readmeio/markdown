import type { Node, Parent, Paragraph, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

const tagPattern = /^<([A-Z][A-Za-z0-9_]*)([^>]*?)(\/?)>([\s\S]*)?$/;
const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

const inlineMdProcessor = unified().use(remarkParse);

const isClosingTag = (value: string, tag: string) => value.trim() === `</${tag}>`;

// Remove matching closing tag from paragraph children; returns updated paragraph and removal status
const stripClosingFromParagraph = (node: Paragraph, tag: string) => {
  if (!Array.isArray(node.children)) return { paragraph: node, found: false } as const;

  const children = [...node.children];
  const closingIndex = children.findIndex(
    child => child.type === 'html' && isClosingTag((child as { value?: string }).value || '', tag),
  );
  if (closingIndex === -1) return { paragraph: node, found: false } as const;

  children.splice(closingIndex, 1);

  return {
    paragraph: { ...node, children },
    found: true,
  } as const;
};

// Replace two child nodes (opening HTML tag + paragraph) with a single replacement node
const replaceChild = (parent: Parent, index: number, replacement: Node) => {
  (parent.children as Node[]).splice(index, 2, replacement);
};

// Parse markdown inside a component's inline content into mdast children.
const parseMdChildren = (value: string): RootContent[] => {
  const parsed = inlineMdProcessor.parse(value);
  return parsed.children || [];
};

// Convert raw attribute string into mdxJsxAttribute entries (strings only; no expressions).
// Handles both key-value attributes (theme="info") and boolean attributes (empty).
export const parseAttributes = (raw: string): MdxJsxAttribute[] => {
  const attributes: MdxJsxAttribute[] = [];
  const attrString = raw.trim();
  if (!attrString) return attributes;

  // Reset regex lastIndex since it's a global regex that maintains state
  attributePattern.lastIndex = 0;
  let match: RegExpExecArray | null = attributePattern.exec(attrString);
  while (match !== null) {
    const [, attrName, attrValue] = match;

    // Boolean attribute (no value) -> set to null
    // Attribute with value -> clean and set string value
    // Note: Attribute value types can't directly be numbers & booleans. String, nulls, undefined are supported.
    const value = attrValue ? attrValue.replace(/^['"]|['"]$/g, '') : null;

    attributes.push({
      type: 'mdxJsxAttribute',
      name: attrName,
      value,
    });
    match = attributePattern.exec(attrString);
  }

  return attributes;
};

// Parse a single HTML-ish tag string into tag name, attributes, self-closing flag, and inline content.
const parseTag = (value: string) => {
  const match = value.match(tagPattern);
  if (!match) return null;

  const [, tag, attrString = '', selfClosing = '', content = ''] = match;
  const attributes = parseAttributes(attrString);

  return {
    tag,
    attributes,
    selfClosing: !!selfClosing,
    content,
  };
};

// Transform PascalCase HTML blocks into mdxJsxFlowElement nodes.
// Remark parses unknown tags as raw HTML; we rewrite them so MDX/rehype treats them as components.
const mdxishComponentBlocks: Plugin<[], Parent> = () => tree => {
  const stack: Parent[] = [tree];

  // Process children depth-first, rewriting opening/closing component HTML pairs
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
    const extraChildren: RootContent[] = content ? parseMdChildren(content.trimStart()) : [];

    if (selfClosing) {
      const componentNode: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: tag,
        attributes,
        children: [],
        position: node.position,
      };
      (parent.children as Node[]).splice(index, 1, componentNode as Node);
      return;
    }

    const next = parent.children[index + 1];
    if (!next || next.type !== 'paragraph') return;

    const { paragraph, found } = stripClosingFromParagraph(next as Paragraph, tag);
    if (!found) return;

    const componentNode: MdxJsxFlowElement = {
      type: 'mdxJsxFlowElement',
      name: tag,
      attributes,
      children: [
        ...(extraChildren as MdxJsxFlowElement['children']),
        ...(paragraph.children as MdxJsxFlowElement['children']),
      ],
      position: {
        start: node.position?.start,
        end: next.position?.end,
      },
    };

    replaceChild(parent, index, componentNode as Node);
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
