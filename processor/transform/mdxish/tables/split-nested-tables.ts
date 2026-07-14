import type { Html } from 'mdast';

import { pointAfter } from '../../../utils';

import { walkTags } from './tag-walker';

const TOP_LEVEL_TABLE_TAG_RE = /^<(?:table|Table)(?=[\s/>])/;
// An `<HTMLBlock>` body is opaque raw HTML handed verbatim to the HTMLBlock
// component; a `<table>` inside it must never be lifted out and re-parsed.
const HTMLBLOCK_WRAPPER_RE = /^\s*<HTMLBlock(?=[\s/>])/;

/**
 * Find every balanced, depth-matched `<table>…</table>` range in an html string.
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
  // `<HTMLBlock>` wraps opaque raw HTML; leave its inner `<table>` untouched so
  // `mdxishHtmlBlocks` can convert the whole node to an html-block next.
  if (HTMLBLOCK_WRAPPER_RE.test(value)) return null;
  // No table text anywhere in the value → skip the htmlparser2 walk entirely.
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
