import type { Emphasis, Strong, Text } from 'mdast';
import type { Position } from 'unist';

type RangeOf = (from: number, to: number) => Position | undefined;

const EMPHASIS_MARKER = /[*_]/;
const WHITESPACE = /\s/;

/**
 * Finds `needle` in `text` from `from`. The repair moves a space across a marker
 * (`Hello** Bold**` → `Hello ` + strong), so fall back to the trimmed text.
 */
const locate = (text: string, needle: string, from: number): [number, number] | null => {
  const exact = text.indexOf(needle, from);
  if (exact !== -1) return [exact, exact + needle.length];
  const core = needle.trim();
  const index = core ? text.indexOf(core, from) : -1;
  return index === -1 ? null : [index, index + core.length];
};

/** Widens emphasis content over the spaces and markers around it, never back past `floor`. */
const widenOverMarkers = (text: string, [start, end]: [number, number], floor: number): [number, number] => {
  let from = start;
  while (from > floor && WHITESPACE.test(text[from - 1])) from -= 1;
  while (from > floor && EMPHASIS_MARKER.test(text[from - 1])) from -= 1;
  let to = end;
  while (to < text.length && WHITESPACE.test(text[to])) to += 1;
  while (to < text.length && EMPHASIS_MARKER.test(text[to])) to += 1;
  return [from, to];
};

/**
 * Positions the parts a malformed-emphasis repair rebuilt from one text node, by finding
 * each part's text in that node's `text` in order.
 */
export const positionEmphasisParts = (parts: (Emphasis | Strong | Text)[], text: string, rangeOf: RangeOf) => {
  let cursor = 0;
  parts.forEach(part => {
    const content = part.type === 'text' ? part : part.children[0];
    if (content?.type !== 'text') return;
    const found = locate(text, content.value, cursor);
    if (!found) return;
    content.position = rangeOf(...found);
    if (part === content) {
      [, cursor] = found;
      return;
    }
    const [start, end] = widenOverMarkers(text, found, cursor);
    part.position = rangeOf(start, end);
    cursor = end;
  });
};
