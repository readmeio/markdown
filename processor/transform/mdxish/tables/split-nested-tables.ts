import type { Html } from 'mdast';

import { pointAfter } from '../../../utils';

import { walkTags } from './tag-walker';

const TOP_LEVEL_TABLE_TAG_RE = /^<(?:table|Table)(?=[\s/>])/;

/**
 * Find every balanced, depth-matched `<table>…</table>` range in an html string.
 * Uses `walkTags` so `<table>`s inside code spans / fenced blocks (masked away)
 * are never matched.
 *
 * `<table>`s inside an `<HTMLBlock>` body are also ignored: that body is opaque
 * raw HTML, so lifting a table out of it would corrupt the block.
 *
 * Note: An implicitly-closed table (no `</table>`, so htmlparser2 synthesizes the
 * close at a later tag) is skipped: splitting there would swallow whatever
 * followed the table into the fragment and drop it, so we leave such a node
 * whole for downstream raw-HTML handling instead.
 */
const findTableRanges = (html: string): { end: number; start: number }[] => {
  const ranges: { end: number; start: number }[] = [];
  let tableDepth = 0;
  let htmlBlockDepth = 0;
  let start = 0;
  walkTags(html, {
    onOpen: ({ name, start: openStart, isSelfClosing, isStrayCloser }) => {
      if (isStrayCloser) return;
      // `<HTMLBlock/>` has no body to protect; only a real open enters one.
      if (name === 'HTMLBlock') {
        if (!isSelfClosing) htmlBlockDepth += 1;
        return;
      }
      if (htmlBlockDepth > 0 || name.toLowerCase() !== 'table') return;
      if (tableDepth === 0) start = openStart;
      tableDepth += 1;
    },
    onClose: ({ name, end, implicit }) => {
      if (name === 'HTMLBlock') {
        if (!implicit && htmlBlockDepth > 0) htmlBlockDepth -= 1;
        return;
      }
      if (implicit || htmlBlockDepth > 0 || name.toLowerCase() !== 'table' || tableDepth === 0) return;
      tableDepth -= 1;
      if (tableDepth === 0) ranges.push({ start, end });
    },
  });
  return ranges;
};

/**
 * Given an HTML node that might contain table sequences inside it, split
 * the node based on the table boundaries so they become a top level node.
 *
 * The surrounding raw HTML (the wrapper's open/close tags) would be re-nested
 * around the parsed tables by rehype-raw.
 *
 * Returns null when there is no wrapped table to extract.
 */
export const splitHtmlWithNestedTables = (node: Html): Html[] | null => {
  const { value } = node;
  // This is a top-level table, so we don't need to split it
  if (TOP_LEVEL_TABLE_TAG_RE.test(value)) return null;
  // No table text anywhere → skip the htmlparser2 walk entirely. (A `<table>` that
  // only appears inside an `<HTMLBlock>` body still yields no ranges below, so it's
  // left whole for `mdxishHtmlBlocks` to convert to an html-block next.)
  if (!/<\/?table/i.test(value)) return null;
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
