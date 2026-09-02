import type { Nodes, Parents, Text } from 'mdast';
import type { Info, State } from 'mdast-util-to-markdown';

const CELL_START_BLOCK_MARKER = /^(?:[-+](?=\s|$)|#{1,6}(?=\s|$)|>)/;
const BR_HTML = /^\s*<br\s*\/?>\s*$/i;

const isLineBreak = (node: Nodes): boolean => {
  if (node.type === 'break') return true;
  if (node.type === 'html') return BR_HTML.test(node.value);

  return node.type === 'mdxJsxTextElement' && 'name' in node && node.name?.toLowerCase() === 'br';
};

const followsLineBreak = (node: Text, parent: Parents | undefined): boolean => {
  const siblings = (parent?.children ?? []) as Nodes[];
  const previous = siblings[siblings.indexOf(node) - 1];

  return !!previous && isLineBreak(previous);
};

/**
 * Re-escapes a leading block marker (`-`, `+`, `#`, `>`) at the start of a table cell, or
 * after a `<br />` within one.
 *
 * A cell is serialized mid-line, so the `atBreak` patterns that escape these characters
 * never fire and an author's `| \- one |` round trips to `| - one |` (RM-17203). Cells are
 * serialized as `containerPhrasing(cell, { before: '|' })`, so `|` marks the cell start.
 */
export const escapeCellStartBlockMarker = (
  serialized: string,
  node: Text,
  parent: Parents | undefined,
  state: State,
  info: Info,
): string => {
  if (serialized.startsWith('\\') || !CELL_START_BLOCK_MARKER.test(serialized)) return serialized;
  if (!state.stack.includes('tableCell') || !(info.before === '|' || followsLineBreak(node, parent))) return serialized;

  return `\\${serialized}`;
};
