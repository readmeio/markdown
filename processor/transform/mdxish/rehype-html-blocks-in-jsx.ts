import type { Element, ElementContent, Properties, Root } from 'hast';
import type { Transformer } from 'unified';

import { visit } from 'unist-util-visit';

import { formatHtmlForMdxish } from '../../utils';

import { base64Decode, HTML_BLOCK_CONTENT_END, HTML_BLOCK_CONTENT_START } from './preprocess-jsx-expressions';

const startEscaped = HTML_BLOCK_CONTENT_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endEscaped = HTML_BLOCK_CONTENT_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Marker emitted as an HTML comment by preprocessJSXExpressions. rehypeRaw parses
// the comment body (sans <!-- -->), so we match the inner form here.
const COMMENT_MARKER_RE = new RegExp(
  `^${startEscaped.replace(/^<!--/, '')}([A-Za-z0-9+/=]+)${endEscaped.replace(/--!?>$/, '')}$`,
);

const KNOWN_HTML_BLOCK_PROPS: Record<string, string> = {
  safemode: 'safeMode',
  runscripts: 'runScripts',
};

function decodeProtectedComment(value: string): string | null {
  const match = value.match(COMMENT_MARKER_RE);
  if (!match) return null;
  try {
    return base64Decode(match[1]);
  } catch {
    return null;
  }
}

function findEncodedPayload(children: ElementContent[]): string | null {
  return children.reduce<string | null>((found, child) => {
    if (found !== null) return found;
    if (child.type !== 'comment') return null;
    return decodeProtectedComment(child.value);
  }, null);
}

function normalizeHtmlBlockProperties(properties: Properties | undefined, html: string): Properties {
  const normalized: Properties = { html };
  if (!properties) return normalized;

  Object.entries(properties).forEach(([key, value]) => {
    if (key === 'html') return;
    const canonical = KNOWN_HTML_BLOCK_PROPS[key.toLowerCase()] ?? key;
    normalized[canonical] = value;
  });
  return normalized;
}

/**
 * Converts <HTMLBlock> elements that survived rehypeRaw (because they were nested
 * inside another JSX block like <Table>, so the mdast-level transformer never saw
 * them) into the canonical <html-block> hast element the renderer expects.
 */
const rehypeHtmlBlocksInJsx = (): Transformer<Root, Root> => tree => {
  visit(tree, 'element', (node: Element) => {
    // rehypeRaw routes HTMLBlock through parse5, which lowercases tag names.
    if (node.tagName.toLowerCase() !== 'htmlblock') return;

    const encoded = findEncodedPayload(node.children ?? []);
    if (encoded === null) return;

    const html = formatHtmlForMdxish(encoded);

    node.tagName = 'html-block';
    node.properties = normalizeHtmlBlockProperties(node.properties, html);
    node.children = [];
  });
};

export default rehypeHtmlBlocksInJsx;
