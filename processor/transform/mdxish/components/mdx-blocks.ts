import type { Insert } from '../tables/utils';
import type { Node, Parent, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { SKIP, visit } from 'unist-util-visit';

import { GENERIC_MDX_COMPONENT_EXCLUDED_TAGS } from '../../../../lib/constants';
import { type ParseAttributesOptions, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';
import { pointAfter } from '../../../utils';
import { expandIndentToColumns, leadingIndent } from '../indentation';
import { buildOffsetMapper, computeLineStarts, offsetToLineCol } from '../tables/remap-positions';
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
 * Strip the shared leading indentation from a component body so it parses as it would at
 * column 0, e.g. `  <p>` / `   text` -> `<p>` / ` text`. Columns still shape parsing
 * (list/blockquote continuation, table rows, the mdxComponent claim gates), and relative
 * indentation is kept so genuinely deeper content still nests. We only strip when a line
 * reaches 4 columns; otherwise leading whitespace survives as text nodes, which mixed
 * component + HTML content needs.
 *
 * Indentation is measured in CommonMark columns (tab = up to 4), matching micromark: a
 * char count (tab = 1) under-measures tab-indented bodies so they slip the gate (#1556).
 */
function safeDeindent(text: string): { content: string; toOriginal: (offset: number) => number } {
  const identity = { content: text, toOriginal: (offset: number) => offset };
  const lines = text.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return identity;

  const indents = nonEmptyLines.map(line => expandIndentToColumns(leadingIndent(line)).length);
  const minIndent = Math.min(...indents);
  const maxIndent = Math.max(...indents);

  if (maxIndent < 4 || minIndent === 0) return identity;

  // Expand each line's leading run to spaces before slicing so a shared indent of mixed
  // tabs/spaces (and partial-tab remainders) strips cleanly while relative depth survives.
  // Per-line bookkeeping lets `toOriginal` map offsets in the deindented text back to
  // `text`'s coordinates, so positions produced by parsing it can be remapped.
  const lineInfo: { newIndentLength: number; newStart: number; origIndent: string; origStart: number }[] = [];
  let origStart = 0;
  let newStart = 0;
  const content = lines
    .map(line => {
      const indent = leadingIndent(line);
      const newIndent = expandIndentToColumns(indent).slice(minIndent);
      lineInfo.push({ newIndentLength: newIndent.length, newStart, origIndent: indent, origStart });
      origStart += line.length + 1;
      const newLine = newIndent + line.slice(indent.length);
      newStart += newLine.length + 1;
      return newLine;
    })
    .join('\n');

  const toOriginal = (offset: number): number => {
    // Binary search for the line containing `offset` (greatest newStart <= offset).
    let lo = 0;
    let hi = lineInfo.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (lineInfo[mid].newStart <= offset) lo = mid;
      else hi = mid - 1;
    }
    const line = lineInfo[lo];
    const delta = offset - line.newStart;
    // Past the rewritten indent, characters correspond one-to-one with the original line.
    if (delta >= line.newIndentLength) return line.origStart + line.origIndent.length + (delta - line.newIndentLength);
    // Inside the rewritten indent: a pure-space indent maps column-for-column (the
    // stripped columns sit before it); a tab-mixed indent has no exact original
    // counterpart, so clamp to the line's content start.
    return /^ *$/.test(line.origIndent) ? line.origStart + minIndent + delta : line.origStart + line.origIndent.length;
  };

  return { content, toOriginal };
}

// `terminateHtmlFlowBlocks` only ever inserts `\n` characters; recover each insert's
// offset (in `original` coordinates) by aligning the two strings.
const newlineInserts = (original: string, repaired: string): Insert[] => {
  if (original === repaired) return [];
  const inserts: Insert[] = [];
  let i = 0;
  for (let j = 0; j < repaired.length; j += 1) {
    if (i < original.length && original[i] === repaired[j]) {
      i += 1;
    } else {
      inserts.push({ offset: i, text: '\n', consumes: 0 });
    }
  }
  return inserts;
};

// Maps an offset in some re-parsed string back to its point in the parsed document.
type ToDocPoint = (offset: number) => { column: number; line: number; offset: number };

// Subtrees whose positions have already been remapped to document coordinates by a
// nested `parseMdChildren`; the enclosing invocation's remap pass must not touch them.
const docMapped = new WeakSet<Node>();

/**
 * Parse component-body markdown into mdast children. Dedenting shifts columns and
 * stales the top-level `terminateHtmlFlowBlocks` decisions, so that one preprocessor
 * re-runs here; other column-anchored fixups (compact headings, tables) do not.
 *
 * The re-parse produces positions relative to the transformed body text, but mdast
 * positions must refer to the parsed document — consumers slice the full source with
 * them (the same contract `mdxishTables` upholds for its re-parsed table parts). When
 * the caller can anchor the body in the document (`toDocOfValue`), every position is
 * remapped back through the body's string edits and into document coordinates.
 */
const parseMdChildren = (value: string, safeMode: boolean, toDocOfValue?: ToDocPoint): RootContent[] => {
  const deindented = safeDeindent(value);
  const headTrim = deindented.content.length - deindented.content.trimStart().length;
  const trimmed = deindented.content.trim();
  const terminated = terminateHtmlFlowBlocks(trimmed);
  const parsed = getInlineMdProcessor({ safeMode }).parse(terminated);

  let toDocOfParse: ToDocPoint | undefined;
  if (toDocOfValue) {
    // Unmap each edit in reverse: parse input → trimmed (blank-line inserts),
    // → deindented (constant head-trim shift), → value (per-line indent rewrites).
    const terminatedToTrimmed = buildOffsetMapper(newlineInserts(trimmed, terminated));
    toDocOfParse = offset => toDocOfValue(deindented.toOriginal(terminatedToTrimmed(offset) + headTrim));
  }

  // Promote nested wrappers bottom-up so an outer wrapper sees markdown buried in a
  // child claimed whole (e.g. `<li>` in `<ol>`) before its containsMarkdownConstruct check (RM-17560).
  // Runs before the remap below so nested bodies can be anchored using this parse's
  // coordinates (node values are verbatim slices of the parse input).
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutually recursive; hoisted decl, safe at runtime
  promoteComponentBlocks(parsed as Parent, safeMode, null, toDocOfParse);

  if (toDocOfParse) {
    visit(parsed as Node, child => {
      // Children produced by a nested parseMdChildren are already in document
      // coordinates — remapping them again through this parse's edits would corrupt them.
      if (docMapped.has(child)) return SKIP;
      if (child.position?.start?.offset != null) child.position.start = toDocOfParse(child.position.start.offset);
      if (child.position?.end?.offset != null) child.position.end = toDocOfParse(child.position.end.offset);
      docMapped.add(child);
      return undefined;
    });
  }

  return parsed.children || [];
};

// Splices trailing content in as sibling nodes. parseMdChildren has already
// promoted any components nested among them (bottom-up); the main loop's
// index-based walk then reaches these spliced siblings and the original children
// they shift down, so no parent re-queue is needed. Each spliced subtree is marked
// `promoted` so the walk doesn't redundantly re-descend into it (its html is gone).
const parseSibling = (
  parent: Parent,
  index: number,
  sibling: string,
  safeMode: boolean,
  promoted: WeakSet<Node>,
  toDocOfValue?: ToDocPoint,
) => {
  const siblingNodes = parseMdChildren(sibling, safeMode, toDocOfValue) as Node[];
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
const positionEndingAtConsumed = (
  nodePosition: Node['position'],
  value: string,
  consumedLength: number,
): Node['position'] => {
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

const createComponentNode = ({
  tag,
  attributes,
  children,
  startPosition,
  endPosition,
}: ComponentNodeOptions): MdxJsxFlowElement => ({
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
function promoteComponentBlocks(
  tree: Parent,
  safeMode: boolean,
  source: string | null,
  toDocOfTree?: ToDocPoint,
): Parent {
  const stack: Parent[] = [tree];
  const parseOpts: ParseAttributesOptions = { preserveExpressionsAsText: safeMode };
  // Subtrees a nested parseMdChildren already promoted wholesale (spliced siblings):
  // re-descending them finds no html to promote, so skip them.
  const promoted = new WeakSet<Node>();
  // At the top level (no toDocOfTree) node positions already refer to the document, so
  // body anchors are built straight from `source`'s line table.
  const sourceLineStarts = !toDocOfTree && source ? computeLineStarts(source) : null;

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

    // Anchor for re-parsed body positions: maps an offset within `value` (shifted by
    // where the body starts) to its document point. Inside a nested re-parse, `value`
    // is a verbatim slice of that parse's input, so the enclosing mapper is exact; at
    // the top level it's approximate only when `value` diverges from the source span
    // (remark strips blockquote/list prefixes) — same caveat as `positionEndingAtConsumed`.
    const bodyToDoc = (bodyStartInValue: number): ToDocPoint | undefined => {
      const startOffset = node.position?.start?.offset;
      if (startOffset == null) return undefined;
      if (toDocOfTree) return offset => toDocOfTree(startOffset + bodyStartInValue + offset);
      if (!sourceLineStarts) return undefined;
      return offset => {
        const docOffset = startOffset + bodyStartInValue + offset;
        return { offset: docOffset, ...offsetToLineCol(sourceLineStarts, docOffset) };
      };
    };

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

      if (contentAfterTag.trim()) {
        // Untrimmed so the sibling's positions can be remapped from its real offset.
        parseSibling(parent, index, contentAfterTag, safeMode, promoted, bodyToDoc(leadingWhitespace + openingTagEnd));
      }
      return;
    }

    // Case 2: Self-contained block (closing tag in content)
    const closingTagIndex = isPlainLowercaseHtml ? plainClosingTagIndex : contentAfterTag.lastIndexOf(closingTagStr);
    if (closingTagIndex >= 0) {
      // Untrimmed so parseMdChildren can dedent before trimming.
      const componentInnerContent = contentAfterTag.substring(0, closingTagIndex);
      const contentAfterClose = contentAfterTag.substring(closingTagIndex + closingTagStr.length);
      let parsedChildren: MdxJsxFlowElement['children'] = [];
      if (componentInnerContent.trim()) {
        try {
          parsedChildren = parseMdChildren(
            componentInnerContent,
            safeMode,
            bodyToDoc(leadingWhitespace + openingTagEnd),
          ) as MdxJsxFlowElement['children'];
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
      if (contentAfterClose.trim()) {
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
      if (contentAfterClose.trim()) {
        parseSibling(
          parent,
          index,
          contentAfterClose,
          safeMode,
          promoted,
          bodyToDoc(leadingWhitespace + openingTagEnd + closingTagIndex + closingTagStr.length),
        );
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

const mdxishMdxComponentBlocks: Plugin<[{ safeMode?: boolean }?], Parent> =
  (opts = {}) =>
  (tree, file) => {
    const source: string | null = file?.value ? String(file.value) : null;
    return promoteComponentBlocks(tree, !!opts.safeMode, source);
  };

export default mdxishMdxComponentBlocks;
