import type { Html, Parent, RootContent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { formatHtmlForMdxish } from '../../utils';

import { createHTMLBlockNode, extractTemplateLiteral } from './mdxish-html-blocks';

type HtmlBlockJsx = MdxJsxFlowElement | MdxJsxTextElement;

// `<HTMLBlock …>{`…`}</HTMLBlock>` embedded inside a raw HTML block (e.g. a
// single-line `<div>…</div>`). CommonMark slurps the whole div as one `html`
// node, so the tokenizer never sees the HTMLBlock — we recover it here
const RAW_HTML_BLOCK_RE = /<HTMLBlock\b([^>]*)>\s*\{\s*`((?:[^`\\]|\\.)*)`\s*\}\s*<\/HTMLBlock>/g;

const stringAttr = (attrs: string, name: string): string | undefined => {
  const quoted = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  if (quoted) return quoted[1];
  const expr = attrs.match(new RegExp(`\\b${name}\\s*=\\s*\\{(true|false)\\}`));
  if (expr) return expr[1];
  return new RegExp(`\\b${name}\\b`).test(attrs) ? 'true' : undefined;
};

const toRunScripts = (raw: string | undefined): boolean | string | undefined =>
  raw === 'true' ? true : raw === 'false' ? false : raw;

/**
 * Splits a raw `html` node that embeds an `<HTMLBlock>` into
 * `[html before, html-block, html after, …]`. Returns null when there is no
 * HTMLBlock to extract, so the caller can leave the node untouched.
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
    if (body !== undefined) {
      parts.push(
        createHTMLBlockNode(
          formatHtmlForMdxish(body),
          node.position,
          toRunScripts(stringAttr(attrs, 'runScripts')),
          stringAttr(attrs, 'safeMode'),
        ),
      );
    }
  }
  return parts;
};

/**
 * Reads a JSX attribute value as a string. Handles `name="x"`, `name={expr}`
 * (returns the raw expression source) and bare boolean attributes (`runScripts`).
 */
const attrValue = (element: HtmlBlockJsx, name: string): string | undefined => {
  const attr = element.attributes.find(a => a.type === 'mdxJsxAttribute' && a.name === name);
  if (!attr || attr.type !== 'mdxJsxAttribute') return undefined;
  if (typeof attr.value === 'string') return attr.value;
  if (attr.value && typeof attr.value === 'object' && 'value' in attr.value) return attr.value.value;
  return 'true'; // bare boolean attribute, e.g. <HTMLBlock runScripts />
};

/**
 * Converts an `<HTMLBlock>` captured by the mdxComponent tokenizer as a JSX
 * element into the canonical `html-block` MDAST node, reading the body straight
 * out of its template-literal expression child.
 */
const htmlBlockFromJsx = (): Transform => tree => {
  visit(
    tree,
    node => node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement',
    (node, index, parent: Parent | undefined) => {
      const element = node as HtmlBlockJsx;
      if (element.name !== 'HTMLBlock' || !parent || index === undefined) return;

      const exprChild = element.children.find(
        child => child.type === 'mdxFlowExpression' || child.type === 'mdxTextExpression',
      ) as { value?: string } | undefined;
      const html = formatHtmlForMdxish(extractTemplateLiteral(exprChild?.value));

      const safeMode = attrValue(element, 'safeMode');
      const runScripts = toRunScripts(attrValue(element, 'runScripts'));

      parent.children[index] = createHTMLBlockNode(html, element.position, runScripts, safeMode);
    },
  );

  // Recover HTMLBlocks embedded inside raw HTML blocks (e.g. inline `<div>`).
  visit(tree, 'html', (node: Html, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;
    const replacement = splitRawHtmlBlocks(node);
    if (replacement) parent.children.splice(index, 1, ...(replacement as typeof parent.children));
  });
};

export default htmlBlockFromJsx;
