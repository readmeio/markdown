import type { List, Node, TableCell, Text } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

/** `<br />` is the only line break a GFM pipe cell can carry, since cells are single-line. */
const createLineBreak = (): MdxJsxTextElement => ({
  type: 'mdxJsxTextElement',
  name: 'br',
  attributes: [],
  children: [],
});

const createText = (value: string): Text => ({ type: 'text', value });

const isText = (node: Node): node is Text => node.type === 'text';

const isList = (node: Node): node is List => node.type === 'list';

const hasChildren = (node: Node): node is Node & { children: Node[] } => 'children' in node;

/**
 * True for a list whose every item is empty — a bare `-`, `*`, `+` or `1.` used as a
 * "not applicable" placeholder. It carries no structure, so it belongs in a cell as text.
 */
export const isBareListMarker = (node: Node): node is List =>
  isList(node) && node.children.length > 0 && node.children.every(item => item.children.length === 0);

/** Bullets serialize with the engine's configured `-`, so a bare `*` or `+` normalizes to it. */
const markerToText = (list: List): Text => createText(list.ordered ? `${list.start ?? 1}.` : '-');

/** Splits `one\ntwo` into `one`, `<br />`, `two`, dropping the empty half of a leading break. */
const splitOnLineBreaks = (value: string): Node[] =>
  value.split('\n').reduce<Node[]>((nodes, segment, index) => {
    if (index > 0) nodes.push(createLineBreak());
    if (segment) nodes.push(createText(segment));
    return nodes;
  }, []);

const normalizeNodes = (nodes: Node[]): Node[] =>
  nodes.flatMap<Node>(node => {
    if (node.type === 'break') return createLineBreak();
    if (isBareListMarker(node)) return markerToText(node);
    if (isText(node)) return splitOnLineBreaks(node.value);
    if (hasChildren(node)) node.children = normalizeNodes(node.children);
    return node;
  });

/**
 * Rewrites the two content classes that are representable in a GFM cell but do not survive
 * one: line breaks (`break` nodes and newlines inside text) become `<br />`, and bare list
 * markers become their literal text.
 *
 * Only safe once the whole table has cleared `canCellBeGfm` — rewriting a cell of a table
 * that still promotes would mangle content the `<Table>` can hold as-is.
 */
export const normalizeCellForGfm = (cell: TableCell): void => {
  cell.children = normalizeNodes(cell.children) as typeof cell.children;
};

/**
 * The promote path's long-standing handling of `break`, kept unchanged: a bare `\` would
 * serialize into a `<td>` as a dangling escape that does not round-trip, so it collapses to
 * the newline a `<Table>` cell renders as a soft break.
 */
export const flattenBreaksToNewlines = (cell: TableCell): void => {
  visit(cell, 'break', (_, index, parent) => {
    parent.children.splice(index, 1, createText('\n'));
  });
};
