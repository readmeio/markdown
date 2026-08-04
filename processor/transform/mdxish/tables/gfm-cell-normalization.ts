import type { List, Node, TableCell, Text } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

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

export const hasChildren = (node: Node): node is Node & { children: Node[] } => 'children' in node;

/**
 * A list holding a single empty, non-task item — a bare `-`, `*`, `+` or `1.` used as a
 * placeholder. Anything more (task state, multiple items) carries structure a cell cannot keep.
 */
const isBareListMarker = (node: Node): node is List =>
  isList(node) &&
  node.children.length === 1 &&
  node.children[0].checked == null &&
  node.children[0].children.length === 0;

/** Bullets serialize with the engine's configured `-`, so a bare `*` or `+` normalizes to it. */
const bareMarkerToText = (list: List): Text => createText(list.ordered ? `${list.start ?? 1}.` : '-');

const splitOnLineBreaks = (value: string): Node[] =>
  value.split('\n').reduce<Node[]>((nodes, segment, index) => {
    if (index > 0) nodes.push(createLineBreak());
    if (segment) nodes.push(createText(segment));
    return nodes;
  }, []);

const normalizeNodes = (nodes: Node[]): Node[] =>
  nodes.flatMap<Node>(node => {
    if (node.type === 'break') return createLineBreak();
    if (isBareListMarker(node)) return bareMarkerToText(node);
    if (isText(node)) return splitOnLineBreaks(node.value);
    if (hasChildren(node)) return { ...node, children: normalizeNodes(node.children) };
    return node;
  });

/**
 * Returns a copy of the cell's children with line breaks rewritten to `<br />` and a bare list
 * marker to text — the two content classes representable in a GFM cell but lost by one.
 */
export const normalizeCellChildrenForGfm = (cell: TableCell): TableCell['children'] =>
  normalizeNodes(cell.children) as TableCell['children'];
