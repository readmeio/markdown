import type { Node, Parent, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { GENERIC_MDX_COMPONENT_EXCLUDED_TAGS } from '../../../lib/constants';
import { emptyTaskListItemFromMarkdown } from '../../../lib/mdast-util/empty-task-list-item';
import { legacyVariableFromMarkdown } from '../../../lib/mdast-util/legacy-variable';
import { mdxComponentFromMarkdown } from '../../../lib/mdast-util/mdx-component';
import { legacyVariable } from '../../../lib/micromark/legacy-variable';
import { mdxComponent } from '../../../lib/micromark/mdx-component';

const pascalCaseTagPattern = /^<([A-Z][A-Za-z0-9_]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>([\s\S]*)?$/;
const tagAttributePattern =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(\{(?:[^{}"'`]|"[^"]*"|'[^']*'|`[^`]*`|\{(?:[^{}"'`]|"[^"]*"|'[^']*'|`[^`]*`)*\})*\}|"[^"]*"|'[^']*'|[^\s"'>]+))?/g;

const inlineMdProcessor = unified()
  .data('micromarkExtensions', [mdxComponent(), legacyVariable()])
  .data('fromMarkdownExtensions', [mdxComponentFromMarkdown(), legacyVariableFromMarkdown(), emptyTaskListItemFromMarkdown()])
  .use(remarkParse)
  .use(remarkGfm);

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
const parseMdChildren = (value: string): RootContent[] => {
  const parsed = inlineMdProcessor.parse(safeDeindent(value).trim());
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
export const parseTag = (value: string) => {
  const match = value.match(pascalCaseTagPattern);
  if (!match) return null;

  const [, tag, attrString = '', selfClosing = '', contentAfterTag = ''] = match;
  return {
    tag,
    attributes: parseAttributes(attrString),
    selfClosing: !!selfClosing,
    contentAfterTag,
    attrString // Just for debugging purposes
  };
};

/**
 * Parse substring content of a node and update the parent's children to include the new nodes.
 */
const parseSibling = (stack: Parent[], parent: Parent, index: number, sibling: string) => {
  const siblingNodes = parseMdChildren(sibling) as Node[];
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
const mdxishComponentBlocks: Plugin<[], Parent> = () => tree => {
  const stack: Parent[] = [tree];

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
    const parsed = parseTag(value.trim());
    if (!parsed) return;

    const { tag, attributes, selfClosing, contentAfterTag = '' } = parsed;

    // Skip tags that have dedicated transformers
    if (GENERIC_MDX_COMPONENT_EXCLUDED_TAGS.has(tag)) return;

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
        parseSibling(stack, parent, index, remainingContent);
      }
      return;
    }

    // Case 2: Self-contained block (closing tag in content)
    if (contentAfterTag.includes(closingTagStr)) {
      // Find the first closing tag
      const closingTagIndex = contentAfterTag.indexOf(closingTagStr);
      // Pass raw (untrimmed) content so dedent in parseMdChildren can
      // normalize indentation before trimming
      const componentInnerContent = contentAfterTag.substring(0, closingTagIndex);
      const contentAfterClose = contentAfterTag.substring(closingTagIndex + closingTagStr.length).trim();
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: componentInnerContent.trim() ? (parseMdChildren(componentInnerContent) as MdxJsxFlowElement['children']) : [],
        startPosition: node.position,
      });
      substituteNodeWithMdxNode(parent, index, componentNode);

      // After the closing tag, there might be more content to be processed
      if (contentAfterClose) {
        parseSibling(stack, parent, index, contentAfterClose);
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

export default mdxishComponentBlocks;
