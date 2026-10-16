import type { Html, Paragraph, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { INLINE_COMPONENT_TAGS } from '../../../../lib/constants';
import { type ParseAttributesOptions, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';
import { type MarkdownFragment, reparseMarkdownFragment } from '../parse-markdown-fragment';

import { hasExpressionAttr, isPascalCase, toMdxJsxTextElement } from './utils';

/**
 * Parse the body of an inline component as phrasing content. Remark always
 * wraps bare text in a paragraph; flatten that single-paragraph wrapper so
 * the result is valid `mdxJsxTextElement` content.
 *
 * Block content inside an inline tag never reaches here (the text tokenizer
 * rejects line endings), so the paragraph-flatten path covers every case we
 * actually produce; other shapes fall back to empty children.
 */
const parsePhrasingChildren = (
  body: MarkdownFragment,
  safeMode: boolean,
  documentSource: string,
): PhrasingContent[] => {
  const textToParse = body.rawText.trim();
  if (!textToParse) return [];
  const [first] = reparseMarkdownFragment(body, textToParse, { documentSource, safeMode });
  return first?.type === 'paragraph' && 'children' in first ? first.children : [];
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
const promoteInlineHtml = (
  node: Html,
  parseOpts: ParseAttributesOptions,
  safeMode: boolean,
  documentSource: string,
): PhrasingContent => {
  const value = node.value ?? '';
  const trimmedValue = value.trim();
  const parsed = parseTag(trimmedValue, parseOpts);
  if (!parsed) return node;

  const { tag, attributes, selfClosing, contentAfterTag = '' } = parsed;

  // Non-inline PascalCase stays flow-level (handled by mdxishComponentBlocks)
  // and dedicated tokenizers (Table, HTMLBlock) own their tags. Inline
  // components (Anchor, Glossary) with expression attrs are promoted here —
  // the text tokenizer captures them as a single html node.
  if (isPascalCase(tag) && !INLINE_COMPONENT_TAGS.has(tag)) return node;

  // Plain inline HTML (no expressions) stays as an html node so rehype-raw
  // parses it with parse5 as normal.
  if (!hasExpressionAttr(attributes)) return node;

  if (selfClosing) return toMdxJsxTextElement(tag, attributes, [], node.position);

  // Paired tag: the text tokenizer captures `<tag …>body</tag>` as one html
  // node, so the body is everything up to the closing tag in contentAfterTag.
  const closingTagStr = `</${tag}>`;
  const closeIdx = contentAfterTag.lastIndexOf(closingTagStr);
  if (closeIdx < 0) return node;

  const bodyStart = value.length - value.trimStart().length + trimmedValue.length - contentAfterTag.length;
  const body = { parentNode: node, offsetInParentNode: bodyStart, rawText: contentAfterTag.slice(0, closeIdx) };
  return toMdxJsxTextElement(tag, attributes, parsePhrasingChildren(body, safeMode, documentSource), node.position);
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
const mdxishInlineMdxHtmlBlocks: Plugin<[{ safeMode?: boolean }?], Root> = (opts = {}) => (tree, file) => {
  const safeMode = !!opts.safeMode;
  const parseOpts: ParseAttributesOptions = { preserveExpressionsAsText: safeMode };
  const documentSource = String(file?.value ?? '');

  visit(tree, 'paragraph', (paragraph: Paragraph) => {
    paragraph.children = paragraph.children.map(child =>
      child.type === 'html' ? promoteInlineHtml(child as Html, parseOpts, safeMode, documentSource) : child,
    );
  });
};

export default mdxishInlineMdxHtmlBlocks;
