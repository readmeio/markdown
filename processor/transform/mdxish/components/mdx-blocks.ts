import type { Node, Parent, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { GENERIC_MDX_COMPONENT_EXCLUDED_TAGS } from '../../../../lib/constants';
import { type ParseAttributesOptions, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';
import { pointAfter } from '../../../utils';
import { expandIndentToColumns, leadingIndent } from '../indentation';
import { tableTags } from '../tables/utils';
import { terminateHtmlFlowBlocks } from '../terminate-html-flow-blocks';

import {
  containsMarkdownConstruct,
  findBalancedClosingTagIndex,
  getInlineMdProcessor,
  hasExpressionAttr,
  isMarkdownPromotableHtmlTag,
  isPascalCase,
  NESTED_TABLE_RE,
} from './utils';

export { parseAttributes, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';

// Matches a JSX attribute expression (e.g. `key={i}`) anywhere in a string. */
const NESTED_ATTR_EXPRESSION_RE = /[\w-]+\s*=\s*\{/;

// Name shape mirrors `componentTagPattern`; the lookbehind skips the inner tag
// of a legacy `<<VARIABLE>>`.
const NESTED_COMPONENT_TAG_RE = /(?<!<)<([A-Z][A-Za-z0-9_]*)[\s/>]/g;

// Excludes tags with dedicated transformers (`Table`, `HTMLBlock`, inline
// components), which expect their wrapper to stay raw.
const hasNestedGenericComponentTag = (content: string): boolean =>
  [...content.matchAll(NESTED_COMPONENT_TAG_RE)].some(match => !GENERIC_MDX_COMPONENT_EXCLUDED_TAGS.has(match[1]));

/**
 * Strip the shared leading indentation from a component body so readability indentation
 * isn't parsed as indented code (4+ columns), e.g. `  <p>` / `   text` -> `<p>` / ` text`.
 * Relative indentation is kept, so content genuinely 4+ columns deeper stays code. We
 * only strip when a line actually reaches 4 columns; otherwise the body is left as-is so
 * its leading whitespace survives as text nodes (mixed component + HTML content needs it).
 *
 * Indentation is measured in CommonMark columns (tab = up to 4), matching how the parser
 * decides indented code. A char count (tab = 1) under-measures tab-indented bodies, so
 * they slip past the 4-column gate and their nested content fragments into code blocks.
 */
function safeDeindent(text: string): string {
  const lines = text.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return text;

  const indents = nonEmptyLines.map(line => expandIndentToColumns(leadingIndent(line)).length);
  const minIndent = Math.min(...indents);
  const maxIndent = Math.max(...indents);

  if (maxIndent < 4 || minIndent === 0) return text;

  // Expand each line's leading run to spaces before slicing so a shared indent of mixed
  // tabs/spaces (and partial-tab remainders) strips cleanly while relative depth survives.
  return lines
    .map(line => {
      const indent = leadingIndent(line);
      return expandIndentToColumns(indent).slice(minIndent) + line.slice(indent.length);
    })
    .join('\n');
}

/**
 * Parse component-body markdown into mdast children. Dedenting shifts columns and
 * stales the top-level `terminateHtmlFlowBlocks` decisions, so that one preprocessor
 * re-runs here; other column-anchored fixups (compact headings, tables) do not.
 */
const parseMdChildren = (value: string, safeMode: boolean): RootContent[] => {
  const parsed = getInlineMdProcessor({ safeMode }).parse(terminateHtmlFlowBlocks(safeDeindent(value).trim()));
  // Promote nested wrappers bottom-up so an outer wrapper sees markdown buried in a
  // child claimed whole (e.g. `<li>` in `<ol>`) before its containsMarkdownConstruct check (RM-17560).
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutually recursive; hoisted decl, safe at runtime
  promoteComponentBlocks(parsed as Parent, safeMode, null);
  return parsed.children || [];
};

// Splices trailing content in as sibling nodes. parseMdChildren has already
// promoted any components nested among them (bottom-up); the main loop's
// index-based walk then reaches these spliced siblings and the original children
// they shift down, so no parent re-queue is needed. Each spliced subtree is marked
// `promoted` so the walk doesn't redundantly re-descend into it (its html is gone).
const parseSibling = (parent: Parent, index: number, sibling: string, safeMode: boolean, promoted: WeakSet<Node>) => {
  const siblingNodes = parseMdChildren(sibling, safeMode) as Node[];
  if (siblingNodes.length > 0) {
    (parent.children as Node[]).splice(index + 1, 0, ...siblingNodes);
    siblingNodes.forEach(siblingNode => promoted.add(siblingNode));
  }
};

interface ComponentNodeOptions {
  attributes: MdxJsxAttribute[];
  children: MdxJsxFlowElement['children'];
  endPosition?: Node['position'];
  startPosition?: Node['position'];
  tag: string;
}

// Ends the position at `consumedLength` so the component doesn't claim trailing
// content the tokenizer swallowed into the same html node.
const positionEndingAtConsumed = (nodePosition: Node['position'], value: string, consumedLength: number): Node['position'] => {
  if (!nodePosition?.start) return nodePosition;
  return { start: nodePosition.start, end: pointAfter(nodePosition.start, value.slice(0, consumedLength)) };
};

// Like `positionEndingAtConsumed`, but measures against the original source so
// blockquote/list prefixes stripped from the html node's value are counted.
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
 * Note: The main goal is to promote PascalCase tags to MDX elements, but we want to promote
 * normal HTML to MDX elements in some cases so they get the full custom parsing behavior.
 * E.g. tags with JSX expressions, nested components, etc.
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
function promoteComponentBlocks(tree: Parent, safeMode: boolean, source: string | null): Parent {
  const stack: Parent[] = [tree];
  const parseOpts: ParseAttributesOptions = { preserveExpressionsAsText: safeMode };
  // Subtrees a nested parseMdChildren already promoted wholesale (spliced siblings):
  // re-descending them finds no html to promote, so skip them.
  const promoted = new WeakSet<Node>();

  const processChildNode = (parent: Parent, index: number) => {
    const node = parent.children[index];
    if (!node) return;
    // Descend into container nodes (lists, blockquotes, …) so their html children
    // are reached — unless the subtree was already promoted upstream.
    if ('children' in node && Array.isArray(node.children) && !promoted.has(node)) {
      stack.push(node as Parent);
    }

    // Only html nodes can be an unparsed MDX component.
    const value = (node as { value?: string }).value;
    if (node.type !== 'html' || typeof value !== 'string') return;

    const trimmed = value.trim();
    const parsed = parseTag(trimmed, parseOpts);
    if (!parsed) return;

    const { tag, attributes, selfClosing, contentAfterTag = '' } = parsed;

    // Offsets so consumed-length math maps back onto the node's real source.
    const leadingWhitespace = value.length - value.trimStart().length;
    const openingTagEnd = trimmed.length - contentAfterTag.length;

    if (GENERIC_MDX_COMPONENT_EXCLUDED_TAGS.has(tag)) return; // owned by dedicated transformers

    const isPascal = isPascalCase(tag);

    // ==== SPECIAL CASES TO PROMOTE NORMAL HTML TO MDX ELEMENTS ====

    // Lowercase inline tags with `{…}` attributes belong to
    // mdxishInlineComponentBlocks; leave them as html for that pass. PascalCase
    // components stay flow-level even when inline (ReadMe's component model).
    if (!isPascal && parent.type === 'paragraph') return;

    // A lowercase wrapper is only promoted when it (or a descendant) carries a
    // JSX expression or nests a component; otherwise it would swallow that inner
    // JSX/component as literal text that rehype-raw's parse5 pass can't handle.
    // Table-structural wrappers are excluded from both — `mdxishTables` re-parses
    // those, so a `{…}` in a cell (e.g. `<code>--depth={n}</code>`) must not
    // accidentally promote the table to an MDX element prematurely.
    const isTableStructuralTag = tag === 'table' || tableTags.has(tag);
    const hasNestedExpressionAttr =
      !selfClosing && !isTableStructuralTag && NESTED_ATTR_EXPRESSION_RE.test(contentAfterTag);
    const hasNestedComponentTag =
      !selfClosing && !isTableStructuralTag && hasNestedGenericComponentTag(contentAfterTag);

    // Promotion: By default commonmark doesn't parse markdown in single line HTML tags (e.g. <div>**bold**</div>)
    // To support that, we try to promote them to MDX elements so the markdown gets parsed
    const isPlainLowercaseHtml =
      !isPascal && !hasExpressionAttr(attributes) && !hasNestedExpressionAttr && !hasNestedComponentTag;
    const plainClosingTagIndex =
      isPlainLowercaseHtml && !selfClosing && isMarkdownPromotableHtmlTag(tag) && !NESTED_TABLE_RE.test(contentAfterTag)
        ? findBalancedClosingTagIndex(contentAfterTag, tag)
        : -1;
    if (isPlainLowercaseHtml && plainClosingTagIndex < 0) return;

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

      const remainingContent = contentAfterTag.trim();
      if (remainingContent) {
        parseSibling(parent, index, remainingContent, safeMode, promoted);
      }
      return;
    }

    // Case 2: Self-contained block (closing tag in content)
    const closingTagIndex = isPlainLowercaseHtml ? plainClosingTagIndex : contentAfterTag.lastIndexOf(closingTagStr);
    if (closingTagIndex >= 0) {
      // Untrimmed so parseMdChildren can dedent before trimming.
      const componentInnerContent = contentAfterTag.substring(0, closingTagIndex);
      const contentAfterClose = contentAfterTag.substring(closingTagIndex + closingTagStr.length).trim();
      let parsedChildren: MdxJsxFlowElement['children'] = [];
      if (componentInnerContent.trim()) {
        try {
          parsedChildren = parseMdChildren(componentInnerContent, safeMode) as MdxJsxFlowElement['children'];
        } catch (error) {
          // Plain HTML bodies can hold anything (e.g. stray braces the strict
          // expression parser rejects) — keep the node raw instead of throwing.
          if (isPlainLowercaseHtml) return;
          throw error;
        }
      }
      if (isPlainLowercaseHtml && !containsMarkdownConstruct(parsedChildren)) return;
      // Lowercase tags are usually inline; unwrap a sole paragraph so their
      // phrasing content isn't spuriously block-wrapped.
      let unwrappedSoleParagraph = false;
      if (!isPascal && parsedChildren.length === 1 && parsedChildren[0].type === 'paragraph') {
        parsedChildren = (parsedChildren[0] as Parent).children as MdxJsxFlowElement['children'];
        unwrappedSoleParagraph = true;
      }
      // Without trailing content the whole node position is correct. With it, end
      // precisely at the closing tag — preferring source offsets when available (the
      // node's value strips blockquote/list prefixes), else the consumed span.
      let endPosition = node.position;
      if (contentAfterClose) {
        endPosition = source
          ? positionEndingAtClosingTagInSource(node.position, closingTagStr, source)
          : positionEndingAtConsumed(
              node.position,
              value,
              leadingWhitespace + openingTagEnd + closingTagIndex + closingTagStr.length,
            );
      }
      const componentNode = createComponentNode({
        tag,
        attributes,
        children: parsedChildren,
        startPosition: node.position,
        endPosition,
      });
      substituteNodeWithMdxNode(parent, index, componentNode);

      // The unwrap reparented the children out of their paragraph, so re-walk them
      // since the children HTML may contain promotable syntax (e.g. `{…}`-attr tags)
      if (unwrappedSoleParagraph) {
        stack.push(componentNode as Parent);
      }

      // Trailing content after the close becomes siblings; parseMdChildren has
      // already promoted any components nested inside both sides, so the promoted
      // subtree itself needs no re-queue.
      if (contentAfterClose) {
        parseSibling(parent, index, contentAfterClose, safeMode, promoted);
      }
    }
  };

  // Depth-first so nodes keep their source order. Index-based (not forEach) and
  // re-reading length each step: parseSibling splices siblings in mid-iteration, and
  // those — plus the original children they shift down — must all stay eligible.
  while (stack.length) {
    const parent = stack.pop();
    if (parent?.children) {
      for (let index = 0; index < parent.children.length; index += 1) {
        processChildNode(parent, index);
      }
    }
  }

  return tree;
}

const mdxishMdxComponentBlocks: Plugin<[{ safeMode?: boolean }?], Parent> = (opts = {}) => (tree, file) => {
  const source: string | null = file?.value ? String(file.value) : null;
  return promoteComponentBlocks(tree, !!opts.safeMode, source);
};

export default mdxishMdxComponentBlocks;
