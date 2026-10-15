import type { Html, InlineCode, Node, Paragraph, Parent, PhrasingContent, Root, RootContent, Text } from 'mdast';
import type { MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { INLINE_COMPONENT_TAGS, INLINE_ONLY_PARENT_TYPES } from '../../../../lib/constants';
import { type ParseAttributesOptions, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';
import { stampReparseSource } from '../reparse-source';

import { getInlineMdProcessor, hasExpressionAttr, isPascalCase, toMdxJsxTextElement } from './utils';

const LEADING_SPACES_RE = /^[ \t]+/;
const TRAILING_SPACES_RE = /[ \t]+$/;

const spaceText = (value: string | undefined): Text[] => (value ? [{ type: 'text', value }] : []);

type PromoteHtml = (node: Html) => PhrasingContent;

// Every inline-only parent, not just paragraphs: a tokenized `<DNT>` in a heading or
// table cell is one html node too, and its markdown only parses once promoted.
const isInlineParent = (node: Node): node is Parent => INLINE_ONLY_PARENT_TYPES.has(node.type);

// gfm unescapes `\|` (never `\\`) in a cell's inline code. A body reparsed inside a cell
// has no cell context, so its code keeps the backslash and the table writer would double it.
const CELL_CODE_PIPE_RE = /\\\|/g;

const unescapeCellCode = (node: Node): void => {
  visit(node, 'inlineCode', (code: InlineCode) => {
    code.value = code.value.replace(CELL_CODE_PIPE_RE, '|');
  });
};

const promoteHtmlIn = (tree: Node, promote: PromoteHtml): void => {
  visit(tree, isInlineParent, (parent: Parent) => {
    parent.children = parent.children.map(child => {
      if (child.type !== 'html') return child;
      const promoted = promote(child as Html);
      if (parent.type === 'tableCell' && promoted !== child) unescapeCellCode(promoted);
      return promoted;
    });
  });
};

// A lone tag or `{}` parses as a block on its own. It stays that node, inline.
const blockAsInline = (node: RootContent, promote: PromoteHtml): PhrasingContent | undefined => {
  if (node.type === 'html') return promote(node as Html);
  if (node.type === 'mdxFlowExpression') return { ...node, type: 'mdxTextExpression' } satisfies MdxTextExpression;
  return undefined;
};

// One body block as phrasing: a paragraph's children, or a lone tag or `{}` as that node.
const blockToPhrasing = (block: RootContent, source: string, promote: PromoteHtml): PhrasingContent[] | undefined => {
  // These nodes root a new coordinate space: their offsets index into `source`.
  if (block.type !== 'paragraph') {
    stampReparseSource([block], source);
    const inline = blockAsInline(block, promote);
    return inline && [inline];
  }
  const paragraph = block as Paragraph;
  stampReparseSource(paragraph.children, source);
  // A nested tokenized tag is one html child here too, so it needs the same promotion.
  promoteHtmlIn(paragraph, promote);
  return paragraph.children;
};

/**
 * Parse the body of an inline component as phrasing content. Remark wraps bare
 * text in a paragraph, so each block is flattened into valid `mdxJsxTextElement`
 * content.
 *
 * A `<DNT>` body can span lines, so a lone tag or `{}` can sit above or below text.
 */
const parsePhrasingChildren = (value: string, safeMode: boolean, promote: PromoteHtml): PhrasingContent[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const blocks = getInlineMdProcessor({ safeMode }).parse(trimmed).children;
  const phrasing = blocks.map(block => blockToPhrasing(block, trimmed, promote));
  // Any other block (`- x`, `# x`) keeps the body as plain text instead of dropping it.
  if (phrasing.some(nodes => !nodes)) return [{ type: 'text', value: trimmed }];
  // Blocks sat on their own lines, so a line break keeps them apart.
  const joined = (phrasing as PhrasingContent[][]).flatMap((nodes, i) =>
    i ? [{ type: 'text', value: '\n' } satisfies Text, ...nodes] : nodes,
  );
  // Edge spaces are content: `Use<DNT> Acme </DNT>now` reads "Use Acme now".
  return [
    ...spaceText(LEADING_SPACES_RE.exec(value)?.[0]),
    ...joined,
    ...spaceText(TRAILING_SPACES_RE.exec(value)?.[0]),
  ];
};

/**
 * Attempt to promote an inline `html` node to an `mdxJsxTextElement`. Scope
 * mirrors what the `mdxComponent` text tokenizer claims: lowercase tags and
 * inline PascalCase components (`INLINE_COMPONENT_TAGS` — Anchor, Glossary),
 * both carrying `{…}` attribute expressions. All other PascalCase components
 * stay with `mdxishComponentBlocks` so they remain `mdxJsxFlowElement`,
 * matching ReadMe's flow-level component authoring model.
 *
 * Returns the original node unchanged when it doesn't qualify.
 */
const promoteInlineHtml = (node: Html, parseOpts: ParseAttributesOptions, safeMode: boolean): PhrasingContent => {
  const parsed = parseTag((node.value ?? '').trim(), parseOpts);
  if (!parsed) return node;

  const { tag, attributes, selfClosing, contentAfterTag = '' } = parsed;

  // Non-inline PascalCase stays flow-level (handled by mdxishComponentBlocks)
  // and dedicated tokenizers (Table, HTMLBlock) own their tags. Inline
  // components (Anchor, Glossary) with expression attrs are promoted here —
  // the text tokenizer captures them as a single html node.
  if (isPascalCase(tag) && !INLINE_COMPONENT_TAGS.has(tag)) return node;

  // Plain inline HTML (no expressions) stays as an html node so rehype-raw
  // parses it with parse5 as normal. A tokenized tag is promoted as is.
  if (!hasExpressionAttr(attributes) && !node.data?.tokenized) return node;

  if (selfClosing) return toMdxJsxTextElement(tag, attributes, [], node.position);

  // Paired tag: the text tokenizer captures `<tag …>body</tag>` as one html
  // node, so the body is everything up to the closing tag in contentAfterTag.
  const closingTagStr = `</${tag}>`;
  const closeIdx = contentAfterTag.lastIndexOf(closingTagStr);
  if (closeIdx < 0) return node;

  const inner = contentAfterTag.slice(0, closeIdx);
  // A promoted body child keeps the stamp its offsets index into.
  const promote: PromoteHtml = child => {
    const promoted = promoteInlineHtml(child, parseOpts, safeMode);
    if (child.data?.reparseSource) stampReparseSource([promoted], child.data.reparseSource);
    return promoted;
  };
  return toMdxJsxTextElement(tag, attributes, parsePhrasingChildren(inner, safeMode, promote), node.position);
};

/**
 * Transform inline html nodes with expression attributes
 * inside paragraphs into `mdxJsxTextElement`s.
 *
 * Runs after `mdxishComponentBlocks`, which skips paragraph-parented html
 * nodes and leaves them for this pass. Two producers put html nodes inside
 * paragraphs:
 *   1. The `mdxComponent` text tokenizer, for lowercase tags and inline
 *      PascalCase components (Anchor, Glossary) with `{…}` attribute
 *      expressions (e.g. `<a href={url}>here</a>`, `<Anchor href={url}>x</Anchor>`).
 *   2. CommonMark's built-in html-text tokenizer, for PascalCase components
 *      (e.g. a single html node for self-closing `<C />`).
 *
 * Eligibility mirrors `mdxishComponentBlocks`: a tag only promotes when it
 * carries an expression attribute and isn't a non-inline PascalCase component;
 * plain inline HTML like `<a href="x">` stays as an html node for rehype-raw.
 */
const mdxishInlineMdxHtmlBlocks: Plugin<[{ safeMode?: boolean }?], Root> = (opts = {}) => tree => {
  const safeMode = !!opts.safeMode;
  const parseOpts: ParseAttributesOptions = { preserveExpressionsAsText: safeMode };

  promoteHtmlIn(tree, child => promoteInlineHtml(child, parseOpts, safeMode));
};

export default mdxishInlineMdxHtmlBlocks;
