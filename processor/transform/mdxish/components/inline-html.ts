import type { Html, Paragraph, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { GENERIC_MDX_COMPONENT_EXCLUDED_TAGS } from '../../../../lib/constants';
import { type ParseAttributesOptions, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';

import { getInlineMdProcessor, hasExpressionAttr, isPascalCase, toMdxJsxTextElement } from './utils';

/**
 * Parse the body of an inline component as phrasing content. Remark always
 * wraps bare text in a paragraph; flatten that single-paragraph wrapper so
 * the result is valid `mdxJsxTextElement` content.
 *
 * Block content inside an inline tag never reaches here (the text tokenizer
 * rejects line endings), so the paragraph-flatten path covers every case we
 * actually produce; other shapes fall back to empty children.
 */
const parsePhrasingChildren = (value: string, safeMode: boolean): PhrasingContent[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const [first] = getInlineMdProcessor({ safeMode }).parse(trimmed).children;
  return first?.type === 'paragraph' ? (first as Paragraph).children : [];
};

/**
 * Attempt to promote a lowercase inline `html` node to an
 * `mdxJsxTextElement`. Scope is deliberately narrow: only lowercase tags
 * carrying `{…}` attribute expressions (what the `mdxComponent` text
 * tokenizer claims). PascalCase components — even when inline — stay with
 * `mdxishComponentBlocks` so they remain `mdxJsxFlowElement`, matching
 * ReadMe's flow-level component authoring model.
 *
 * Returns the original node unchanged when it doesn't qualify.
 */
const promoteInlineHtml = (node: Html, parseOpts: ParseAttributesOptions, safeMode: boolean): PhrasingContent => {
  const parsed = parseTag((node.value ?? '').trim(), parseOpts);
  if (!parsed) return node;

  const { tag, attributes, selfClosing, contentAfterTag = '' } = parsed;

  // PascalCase stays flow-level; handled by mdxishComponentBlocks.
  if (isPascalCase(tag)) return node;

  // Dedicated tokenizers (Table, HTMLBlock, Glossary, Anchor) handle their
  // own tags — don't hijack them here.
  if (GENERIC_MDX_COMPONENT_EXCLUDED_TAGS.has(tag)) return node;

  // Plain inline HTML (no expressions) stays as an html node so rehype-raw
  // parses it with parse5 as normal.
  if (!hasExpressionAttr(attributes)) return node;

  if (selfClosing) return toMdxJsxTextElement(tag, attributes, [], node.position);

  // Paired tag: the text tokenizer captures `<tag …>body</tag>` as one html
  // node, so the body is everything up to the closing tag in contentAfterTag.
  const closingTagStr = `</${tag}>`;
  const closeIdx = contentAfterTag.lastIndexOf(closingTagStr);
  if (closeIdx < 0) return node;

  const inner = contentAfterTag.slice(0, closeIdx);
  return toMdxJsxTextElement(tag, attributes, parsePhrasingChildren(inner, safeMode), node.position);
};

/**
 * Transform inline html nodes with expression attributes
 * inside paragraphs into `mdxJsxTextElement`s.
 *
 * Runs after `mdxishComponentBlocks`, which skips paragraph-parented html
 * nodes and leaves them for this pass. Two producers put html nodes inside
 * paragraphs:
 *   1. The `mdxComponent` text tokenizer, for lowercase tags with `{…}`
 *      attribute expressions (e.g. `<a href={url}>here</a>`).
 *   2. CommonMark's built-in html-text tokenizer, for PascalCase components
 *      (e.g. a single html node for self-closing `<C />`).
 *
 * Eligibility mirrors `mdxishComponentBlocks`: lowercase tags only promote
 * when they carry an expression attribute; plain inline HTML like
 * `<a href="x">` stays as an html node for rehype-raw.
 */
const mdxishInlineMdxHtmlBlocks: Plugin<[{ safeMode?: boolean }?], Root> = (opts = {}) => tree => {
  const safeMode = !!opts.safeMode;
  const parseOpts: ParseAttributesOptions = { preserveExpressionsAsText: safeMode };

  visit(tree, 'paragraph', (paragraph: Paragraph) => {
    paragraph.children = paragraph.children.map(child =>
      child.type === 'html' ? promoteInlineHtml(child as Html, parseOpts, safeMode) : child,
    );
  });
};

export default mdxishInlineMdxHtmlBlocks;
