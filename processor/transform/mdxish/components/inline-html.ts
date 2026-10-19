import type { FootnoteDefinition, Html, InlineCode, Node, Paragraph, Parent, PhrasingContent, Root, Text } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { INLINE_COMPONENT_TAGS, INLINE_ONLY_PARENT_TYPES } from '../../../../lib/constants';
import { type ParseAttributesOptions, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';
import { stampReparseSource } from '../reparse-source';

import { getInlineMdProcessor, hasExpressionAttr, isPascalCase, toMdxJsxTextElement } from './utils';

const LEADING_SPACES_RE = /^[ \t]+/;
const TRAILING_SPACES_RE = /[ \t]+$/;

// gfm unescapes `\|` in a cell's inline code, but a body reparsed on its own has no cell.
const CELL_CODE_PIPE_RE = /\\\|/g;

type PromoteHtml = (node: Html) => PhrasingContent;
type BodyProcessor = ReturnType<typeof getInlineMdProcessor>;

const spaceText = (value: string | undefined): Text[] => (value ? [{ type: 'text', value }] : []);

const isInlineParent = (node: Node): node is Parent => INLINE_ONLY_PARENT_TYPES.has(node.type);

const unescapeCellCode = (node: Node): void => {
  visit(node, 'inlineCode', (code: InlineCode) => {
    code.value = code.value.replace(CELL_CODE_PIPE_RE, '|');
  });
};

/** Promote every html child of an inline parent (paragraph, heading, table cell). */
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

/**
 * Parse the body of an inline component as phrasing content. Remark always
 * wraps bare text in a paragraph; flatten that single-paragraph wrapper so
 * the result is valid `mdxJsxTextElement` content.
 *
 * The body is parsed as phrasing only, so it is always one paragraph.
 */
const parsePhrasingChildren = (value: string, processor: BodyProcessor, promote: PromoteHtml): PhrasingContent[] => {
  const trimmed = value.trim();
  // A body of only spaces is still a separator: `Use<NoTranslate> </NoTranslate>now` reads "Use now".
  if (!trimmed) return spaceText(value);
  const [paragraph] = processor.parse(trimmed).children as Paragraph[];
  // These children root a new coordinate space: their offsets index into `trimmed`.
  stampReparseSource(paragraph.children, trimmed);
  promoteHtmlIn(paragraph, promote);
  // Edge spaces are content: `Use<NoTranslate> Acme </NoTranslate>now` reads "Use Acme now".
  return [
    ...spaceText(LEADING_SPACES_RE.exec(value)?.[0]),
    ...paragraph.children,
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
const promoteInlineHtml = (node: Html, parseOpts: ParseAttributesOptions, processor: BodyProcessor): PhrasingContent => {
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
    const promoted = promoteInlineHtml(child, parseOpts, processor);
    if (child.data?.reparseSource) stampReparseSource([promoted], child.data.reparseSource);
    return promoted;
  };
  return toMdxJsxTextElement(tag, attributes, parsePhrasingChildren(inner, processor, promote), node.position);
};

/**
 * Transform inline html nodes with expression attributes
 * inside inline parents into `mdxJsxTextElement`s.
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
  const footnotes: string[] = [];
  visit(tree, 'footnoteDefinition', (def: FootnoteDefinition) => {
    footnotes.push(def.identifier.toUpperCase());
  });
  const processor = getInlineMdProcessor({ footnotes, phrasing: true, safeMode });

  promoteHtmlIn(tree, child => promoteInlineHtml(child, parseOpts, processor));
};

export default mdxishInlineMdxHtmlBlocks;
