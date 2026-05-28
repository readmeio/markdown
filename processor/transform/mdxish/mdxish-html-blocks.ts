import type { HTMLBlock } from '../../../types';
import type { Html, Paragraph, Parent, RootContent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { formatHtmlForMdxish } from '../../utils';

type HtmlBlockJsx = MdxJsxFlowElement | MdxJsxTextElement;

// `<HTMLBlock …>{`…`}</HTMLBlock>` embedded inside a raw HTML block (e.g. a
// single-line `<div>…</div>`). CommonMark slurps the whole div as one `html`
// node, so the tokenizer never sees the HTMLBlock — we recover it here.
const RAW_HTML_BLOCK_RE = /<HTMLBlock\b([^>]*)>\s*\{\s*`((?:[^`\\]|\\.)*)`\s*\}\s*<\/HTMLBlock>/g;
// Opening `<HTMLBlock …>` as its own `html` node — produced inside a paragraph
// when an HTMLBlock appears inline alongside text.
const HTML_BLOCK_OPEN_RE = /^<HTMLBlock\b([^>]*)>$/;

/**
 * Builds the canonical `html-block` MDAST node the renderer expects.
 */
const createHtmlBlockNode = (
  html: string,
  position: HTMLBlock['position'],
  runScripts?: boolean | string,
  safeMode?: string,
): HTMLBlock => ({
  position,
  children: [{ type: 'text', value: html }],
  type: NodeTypes.htmlBlock,
  data: {
    hName: 'html-block',
    hProperties: {
      html,
      ...(runScripts !== undefined && { runScripts }),
      ...(safeMode !== undefined && { safeMode }),
    },
  },
});

/**
 * Reads the cooked string out of a brace expression wrapping a single template
 * literal (`` `<p>n</p>` `` → `<p>n</p>`).
 */
const extractTemplateLiteral = (value: string | undefined): string => {
  if (!value) return '';
  const match = value.trim().match(/^`([\s\S]*)`$/);
  // Non-template-literal bodies (e.g. `{someVar}`) are malformed mdxish input;
  // returning '' beats shipping JS identifier source as an HTML payload.
  return match ? match[1] : '';
};

const toRunScripts = (raw: string | undefined): boolean | string | undefined =>
  raw === 'true' ? true : raw === 'false' ? false : raw;

/** Reads an attribute from a raw `<HTMLBlock …>` attribute string. */
const rawAttr = (attrs: string, name: string): string | undefined => {
  const quoted = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  if (quoted) return quoted[1];
  const expr = attrs.match(new RegExp(`\\b${name}\\s*=\\s*\\{(true|false)\\}`));
  if (expr) return expr[1];
  return new RegExp(`\\b${name}\\b`).test(attrs) ? 'true' : undefined;
};

/** Reads an attribute from a parsed `<HTMLBlock>` JSX element. */
const jsxAttr = (element: HtmlBlockJsx, name: string): string | undefined => {
  const attr = element.attributes.find(a => a.type === 'mdxJsxAttribute' && a.name === name);
  if (!attr || attr.type !== 'mdxJsxAttribute') return undefined;
  if (typeof attr.value === 'string') return attr.value;
  if (attr.value && typeof attr.value === 'object' && 'value' in attr.value) return attr.value.value;
  return 'true'; // bare boolean attribute, e.g. <HTMLBlock runScripts />
};

/** Builds an `html-block` from a raw attribute string and (unparsed) body. */
const htmlBlockFromRaw = (attrs: string, html: string, position: HTMLBlock['position']): HTMLBlock =>
  createHtmlBlockNode(formatHtmlForMdxish(html), position, toRunScripts(rawAttr(attrs, 'runScripts')), rawAttr(attrs, 'safeMode'));

/**
 * Splits a raw `html` node that embeds one or more `<HTMLBlock>`s into
 * `[html before, html-block, html after, …]`. Returns null when there is none.
 *
 * `String.split` on a regex with capture groups interleaves the captures into
 * the result, so segments arrive as `[text, attrs, body, text, attrs, body, …]`.
 */
const splitRawHtmlBlocks = (node: Html): RootContent[] | null => {
  const segments = node.value.split(RAW_HTML_BLOCK_RE);
  if (segments.length === 1) return null; // no <HTMLBlock> present

  const parts: RootContent[] = [];
  for (let i = 0; i < segments.length; i += 3) {
    const [text, attrs, body] = segments.slice(i, i + 3);
    if (text) parts.push({ type: 'html', value: text });
    if (body !== undefined) parts.push(htmlBlockFromRaw(attrs, body, node.position));
  }
  return parts;
};

/**
 * Converts every `<HTMLBlock>` shape that survives parsing into the canonical
 * `html-block` MDAST node, reading the body from the tokenizer's template-literal
 * expression. Three shapes occur:
 *
 *   1. JSX element (`mdxJsxFlowElement`/`mdxJsxTextElement`) — multiline/block
 *      context and table cells (after their remarkMdx re-parse).
 *   2. Raw `html` blob (`splitRawHtmlBlocks`) — single-line top-level, or nested
 *      in raw HTML like an inline `<div>`.
 *   3. Inline-in-paragraph — split into `html` + expression + `html` siblings.
 *
 * Runs *after* `mdxishTables` so table cells are re-parsed first;
 * `mdxishTables` recognizes the still-JSX `<HTMLBlock>` element when deciding to
 * keep a table as a JSX `<Table>`. This replaces the old base64-comment marker
 * machinery — the #1455 tokenizer hands the body over already parsed.
 */
const mdxishHtmlBlocks = (): Transform => tree => {
  // Shape 1: tokenized JSX element.
  visit(
    tree,
    node => node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement',
    (node, index, parent: Parent | undefined) => {
      const element = node as HtmlBlockJsx;
      if (element.name !== 'HTMLBlock' || !parent || index === undefined) return;

      const exprChild = element.children.find(
        child => child.type === 'mdxFlowExpression' || child.type === 'mdxTextExpression',
      ) as { value?: string } | undefined;

      parent.children[index] = createHtmlBlockNode(
        formatHtmlForMdxish(extractTemplateLiteral(exprChild?.value)),
        element.position,
        toRunScripts(jsxAttr(element, 'runScripts')),
        jsxAttr(element, 'safeMode'),
      );
    },
  );

  // Shape 2: raw HTML blob.
  visit(tree, 'html', (node: Html, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;
    const replacement = splitRawHtmlBlocks(node);
    if (replacement) parent.children.splice(index, 1, ...(replacement as typeof parent.children));
  });

  // Shape 3: inline within a paragraph — `<HTMLBlock>` open/close arrive as
  // separate `html` siblings with the template-literal expression between them.
  visit(tree, 'paragraph', (paragraph: Paragraph) => {
    // An html-block is block content, so it isn't a valid PhrasingContent child;
    // widen to RootContent (which HTMLBlock belongs to) for the in-place splice.
    const children = paragraph.children as RootContent[];
    for (let i = 0; i < children.length; i += 1) {
      const open = children[i];
      const openMatch = open.type === 'html' ? open.value.match(HTML_BLOCK_OPEN_RE) : null;
      if (!openMatch) continue; // eslint-disable-line no-continue

      const closeIdx = children.findIndex(
        (child, j) => j > i && child.type === 'html' && child.value === '</HTMLBlock>',
      );
      if (closeIdx === -1) continue; // eslint-disable-line no-continue

      const body = children
        .slice(i + 1, closeIdx)
        .map(child => {
          if (child.type === 'mdxTextExpression' || child.type === 'mdxFlowExpression') {
            return extractTemplateLiteral(child.value);
          }
          // Preserve raw text from any other phrasing sibling (e.g. stray
          // whitespace or content the tokenizer didn't claim) so it isn't
          // silently dropped from the html payload.
          return 'value' in child && typeof child.value === 'string' ? child.value : '';
        })
        .join('');

      children.splice(i, closeIdx - i + 1, htmlBlockFromRaw(openMatch[1], body, open.position));
    }
  });
};

export default mdxishHtmlBlocks;
