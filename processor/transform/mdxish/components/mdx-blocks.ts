import type { Node, Parent, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { GENERIC_MDX_COMPONENT_EXCLUDED_TAGS } from '../../../../lib/constants';
import { type ParseAttributesOptions, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';

import { getInlineMdProcessor, hasExpressionAttr, isPascalCase } from './utils';

export { parseAttributes, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';

/** Matches a JSX attribute expression (e.g. `key={i}`) anywhere in a string. */
const NESTED_ATTR_EXPRESSION_RE = /[\w-]+\s*=\s*\{/;

/**
 * Reduce leading whitespace on all lines just enough to prevent
 * remark from treating indented content as code blocks (4+ spaces).
 * Preserves relative indentation so whitespace text nodes are
 * maintained in the HAST output.
 */
function safeDeindent(text: string): string {
  const lines = text.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return text;

  const minIndent = Math.min(
    ...nonEmptyLines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    }),
  );

  // Only strip enough indent to keep all lines below the 4-space code threshold
  const stripAmount = Math.max(0, minIndent - 3);
  if (stripAmount === 0) return text;
  return lines.map(line => line.slice(stripAmount)).join('\n');
}

/**
 * Parse markdown content into mdast children nodes.
 * Dedents the content first to prevent indented component content
 * (from nested components) from being treated as code blocks.
 */
const parseMdChildren = (value: string, safeMode: boolean): RootContent[] => {
  const parsed = getInlineMdProcessor({ safeMode }).parse(safeDeindent(value).trim());
  return parsed.children || [];
};

/**
 * Parse substring content of a node and update the parent's children to include the new nodes.
 */
const parseSibling = (stack: Parent[], parent: Parent, index: number, sibling: string, safeMode: boolean) => {
  const siblingNodes = parseMdChildren(sibling, safeMode) as Node[];
  // The new sibling nodes might contain new components to be processed
  if (siblingNodes.length > 0) {
    (parent.children as Node[]).splice(index + 1, 0, ...siblingNodes);
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

type Point = NonNullable<Node['position']>['start'];

/**
 * Advance a point by the substring of source consumed from it.
 */
const pointAfter = (start: Point, consumed: string): Point => {
  const newlineIndex = consumed.lastIndexOf('\n');
  const newlineCount = newlineIndex === -1 ? 0 : consumed.split('\n').length - 1;
  return {
    line: start.line + newlineCount,
    column: newlineCount === 0 ? start.column + consumed.length : consumed.length - newlineIndex,
    offset: start.offset + consumed.length,
  };
};

/**
 * Build a position ending at `consumedLength` into the html node's value, so the
 * component doesn't claim trailing content the tokenizer swallowed into one node.
 */
const positionEndingAtConsumed = (nodePosition: Node['position'], value: string, consumedLength: number): Node['position'] => {
  if (!nodePosition?.start) return nodePosition;
  return { start: nodePosition.start, end: pointAfter(nodePosition.start, value.slice(0, consumedLength)) };
};

/**
 * Build a position ending right after the last occurrence of `closingTag` within
 * this node's span in the original source. Used in the trailing-content path so
 * the offset is computed against the real source bytes (including blockquote/list
 * prefixes that were stripped from the html node's value).
 */
const positionEndingAtClosingTagInSource = (
  nodePosition: Node['position'],
  closingTag: string,
  source: string,
): Node['position'] => {
  if (!nodePosition?.start || !nodePosition.end) return nodePosition;
  const nodeSource = source.slice(nodePosition.start.offset, nodePosition.end.offset);
  const closingTagOffset = nodeSource.lastIndexOf(closingTag);
  if (closingTagOffset === -1) return nodePosition;
  const consumed = nodeSource.slice(0, closingTagOffset + closingTag.length);
  return { start: nodePosition.start, end: pointAfter(nodePosition.start, consumed) };
};

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
 *
 * The mdx-component micromark tokenizer ensures that multi-line components are captured
 * as single HTML nodes, so this transformer only needs to handle two cases:
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
 *   content
 * </Component>
 * ```
 * Parsed as: `html: "<Component>\n  content\n</Component>"`
 * The opening tag, content, and closing tag are all captured in one HTML node
 * (guaranteed by the mdx-component tokenizer).
 */
const mdxishMdxComponentBlocks: Plugin<[{ safeMode?: boolean }?], Parent> = (opts = {}) => (tree, file) => {
  const stack: Parent[] = [tree];
  const safeMode = !!opts.safeMode;
  const source: string | null = file?.value ? String(file.value) : null;
  const parseOpts: ParseAttributesOptions = { preserveExpressionsAsText: safeMode };

  const processChildNode = (parent: Parent, index: number) => {
    const node = parent.children[index];
    if (!node) return;
    if ('children' in node && Array.isArray(node.children)) {
      stack.push(node as Parent);
    }

    // Only visit HTML nodes with an actual html tag,
    // which means a potential unparsed MDX component
    const value = (node as { value?: string }).value;
    if (node.type !== 'html' || typeof value !== 'string') return;

    const trimmed = value.trim();
    const parsed = parseTag(trimmed, parseOpts);
    if (!parsed) return;

    const { tag, attributes, selfClosing, contentAfterTag = '' } = parsed;

    // Offset of `trimmed` within the (possibly whitespace-padded) html node value,
    // so consumed-length math maps back onto the node's real source offsets.
    const leadingWhitespace = value.length - value.trimStart().length;
    // Index right after the opening tag's `>` within `trimmed`.
    const openingTagEnd = trimmed.length - contentAfterTag.length;

    // Skip tags that have dedicated transformers
    if (GENERIC_MDX_COMPONENT_EXCLUDED_TAGS.has(tag)) return;

    const isPascal = isPascalCase(tag);

    // Lowercase inline tags (inside a paragraph) with `{…}` attributes are
    // promoted to `mdxJsxTextElement` by mdxishInlineComponentBlocks. Skip
    // them here so they stay as html for that pass; PascalCase components
    // keep going through this transformer (they stay flow-level even when
    // inline, which is how ReadMe's custom components are modeled).
    if (!isPascal && parent.type === 'paragraph') return;

    // Lowercase HTML tags are eligible when they (or a descendant tag in their
    // content, e.g. a `.map()` body returning JSX with `key={i}`) carry a
    // JSX-expression attribute. Without this, a wrapper `<div>` with only plain
    // attributes (or none) swallows its whole nested block — including any
    // `style={{...}}`/`.map()` JSX inside it — as literal HTML text, which
    // rehype-raw's parse5 pass then garbles (it has no notion of JS expressions).
    // Plain HTML with no expressions anywhere stays as an html node so
    // rehype-raw handles it as normal.
    const hasNestedExpressionAttr = !selfClosing && NESTED_ATTR_EXPRESSION_RE.test(contentAfterTag);
    if (!isPascal && !hasExpressionAttr(attributes) && !hasNestedExpressionAttr) return;

    const closingTagStr = `</${tag}>`;

    // Case 1: Self-closing tag
    if (selfClosing) {
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: [],
        startPosition: node.position,
        // End at the self-closing tag, not at any trailing content.
        endPosition: positionEndingAtConsumed(node.position, value, leadingWhitespace + openingTagEnd),
      });
      substituteNodeWithMdxNode(parent, index, componentNode);

      // Check and parse if there's relevant content after the current closing tag
      const remainingContent = contentAfterTag.trim();
      if (remainingContent) {
        parseSibling(stack, parent, index, remainingContent, safeMode);
      }
      return;
    }

    // Case 2: Self-contained block (closing tag in content)
    if (contentAfterTag.includes(closingTagStr)) {
      // Find the first closing tag
      const closingTagIndex = contentAfterTag.lastIndexOf(closingTagStr);
      // Pass raw (untrimmed) content so dedent in parseMdChildren can
      // normalize indentation before trimming
      const componentInnerContent = contentAfterTag.substring(0, closingTagIndex);
      const contentAfterClose = contentAfterTag.substring(closingTagIndex + closingTagStr.length).trim();
      let parsedChildren: MdxJsxFlowElement['children'] = componentInnerContent.trim()
        ? (parseMdChildren(componentInnerContent, safeMode) as MdxJsxFlowElement['children'])
        : [];
      // Lowercase HTML tags are usually inline (e.g. <a>, <span>). Remark wraps
      // bare text in a paragraph; unwrap when there's exactly one paragraph so
      // phrasing content isn't spuriously block-wrapped.
      if (!isPascal && parsedChildren.length === 1 && parsedChildren[0].type === 'paragraph') {
        parsedChildren = (parsedChildren[0] as Parent).children as MdxJsxFlowElement['children'];
      }
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: parsedChildren,
        startPosition: node.position,
        // When trailing content follows the closing tag, compute the end position precisely
        // within the html node's value so the component doesn't claim that content.
        // Prefer source-based positioning when the original source is available: the html
        // node's value has '> '/space prefixes stripped for blockquotes/list items, so
        // positionEndingAtConsumed would undercount source offsets. When the entire node
        // is consumed, use the original node position directly.
        endPosition: contentAfterClose
          ? source
            ? positionEndingAtClosingTagInSource(node.position, closingTagStr, source)
            : positionEndingAtConsumed(
                node.position,
                value,
                leadingWhitespace + openingTagEnd + closingTagIndex + closingTagStr.length,
              )
          : node.position,
      });
      substituteNodeWithMdxNode(parent, index, componentNode);

      // After the closing tag, there might be more content to be processed
      if (contentAfterClose) {
        parseSibling(stack, parent, index, contentAfterClose, safeMode);
      } else if (componentNode.children.length > 0) {
        // The content inside the component block might contain new components to be processed
        stack.push(componentNode as Parent);
      }
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

export default mdxishMdxComponentBlocks;
