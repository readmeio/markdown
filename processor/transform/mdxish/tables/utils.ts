import type { Html, Node } from 'mdast';

import { pointAfter } from '../../../utils';

import { walkTags } from './tag-walker';

export interface Insert {
  consumes?: number;
  offset: number;
  text: string;
}

export interface RepairResult {
  inserts: Insert[];
  value: string;
}


export const tableTags = new Set([
  'thead',
  'tbody',
  'tfoot',
  'caption',
  'colgroup',
  'col',
  'tr',
  'th',
  'td',
]);

/**
 * Replaces every paragraph node with its inline children. Used where paragraphs
 * are parser artifacts (remarkMdx wrapping inline JSX), not real content.
 */
export const unwrapParagraphNodes = (children: Node[]): Node[] => {
  return children.flatMap(child => {
    if (child.type === 'paragraph' && 'children' in child && Array.isArray(child.children)) {
      return child.children as Node[];
    }
    return [child];
  });
};

/**
 * If the cell has exactly one paragraph child, unwrap it so its inline children sit
 * directly under the cell (matches GFM table cell shape and avoids stray `<p>` wrappers).
 *
 * When there are multiple paragraphs, leave them intact — they represent distinct lines
 * of content that need to be preserved for JSX `<Table>` serialization.
 */
export const unwrapSoleParagraph = (children: Node[]): Node[] => {
  const paragraphCount = children.filter(c => c.type === 'paragraph').length;
  if (paragraphCount !== 1) return children;

  return unwrapParagraphNodes(children);
};

/**
 * Splice each text into `html` at its offset. Inserts at the same offset
 * are emitted in their input order (a stable sort by offset), so callers can
 * rely on innermost-first ordering by emitting events in stack-unwind order.
 */
export const applyInserts = (html: string, inserts: Insert[]): RepairResult => {
  if (inserts.length === 0) return { value: html, inserts: [] };
  const sorted = [...inserts].sort((a, b) => a.offset - b.offset);

  let out = '';
  let cursor = 0;
  sorted.forEach(({ offset, text, consumes = 0 }) => {
    const clamped = Math.min(Math.max(offset, cursor), html.length);
    if (clamped > cursor) {
      out += html.slice(cursor, clamped);
      cursor = clamped;
    }
    out += text;
    cursor = Math.min(cursor + consumes, html.length);
  });
  return { value: out + html.slice(cursor), inserts: sorted };
};

/**
 * Find every balanced, depth-matched `<table>…</table>` range in an html string
 * Uses `walkTags` so `<table>`s inside code spans / fenced blocks (masked away)
 * are never matched.
 *
 * Note: An implicitly-closed table (no `</table>`, so htmlparser2 synthesizes the
 * close at a later tag) is skipped: splitting there would swallow whatever
 * followed the table into the fragment and drop it, so we leave such a node
 * whole for downstream raw-HTML handling instead.
 */
const findTableRanges = (html: string): { end: number; start: number }[] => {
  const ranges: { end: number; start: number }[] = [];
  let depth = 0;
  let start = 0;
  walkTags(html, {
    onOpen: ({ name, start: openStart, isStrayCloser }) => {
      if (name.toLowerCase() !== 'table' || isStrayCloser) return;
      if (depth === 0) start = openStart;
      depth += 1;
    },
    onClose: ({ name, end, implicit }) => {
      if (implicit || name.toLowerCase() !== 'table' || depth === 0) return;
      depth -= 1;
      if (depth === 0) ranges.push({ start, end });
    },
  });
  return ranges;
};

/**
 * Given an HTML node that might contain table sequences inside it, split
 * the node based on the table boundaries so they become a top level node
 * 
 * The surrounding raw HTML (the wrapper's open/close tags) would be re-nested 
 * around the parsed tables by rehype-raw
 *
 * Returns null when there is no wrapped table to extract.
 */
const TOP_LEVEL_TABLE_TAG_RE = /^<(?:table|Table)(?=[\s/>])/;

export const splitHtmlWithNestedTables = (node: Html): Html[] | null => {
  const { value } = node;
  // This is a top-level table, so we don't need to split it
  if (TOP_LEVEL_TABLE_TAG_RE.test(value)) return null;
  const ranges = findTableRanges(value);
  if (ranges.length === 0) return null;

  const base = node.position?.start;
  const sliceToHtml = (from: number, to: number): Html => ({
    type: 'html',
    value: value.slice(from, to),
    ...(base && {
      position: { start: pointAfter(base, value.slice(0, from)), end: pointAfter(base, value.slice(0, to)) },
    }),
  });

  const parts: Html[] = [];
  let cursor = 0;
  ranges.forEach(({ start, end }) => {
    if (start > cursor) parts.push(sliceToHtml(cursor, start));
    parts.push(sliceToHtml(start, end)); // starts with `<table` → picked up by the main pass
    cursor = end;
  });
  if (cursor < value.length) parts.push(sliceToHtml(cursor, value.length));
  return parts;
};

