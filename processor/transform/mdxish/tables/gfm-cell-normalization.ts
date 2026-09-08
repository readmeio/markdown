import type { Node, TableCell, Text } from 'mdast';
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

export const hasChildren = (node: Node): node is Node & { children: Node[] } => 'children' in node;

const splitOnLineBreaks = (value: string): Node[] =>
  value.split('\n').reduce<Node[]>((nodes, segment, index) => {
    if (index > 0) nodes.push(createLineBreak());
    if (segment) nodes.push(createText(segment));
    return nodes;
  }, []);

const normalizeNodes = (nodes: Node[]): Node[] =>
  nodes.flatMap<Node>(node => {
    if (node.type === 'break') return createLineBreak();
    if (isText(node)) return splitOnLineBreaks(node.value);
    if (hasChildren(node)) return { ...node, children: normalizeNodes(node.children) };
    return node;
  });

/**
 * Returns a copy of the cell's children with line breaks — `break` nodes and newlines inside
 * text — rewritten to the `<br />` a single-line GFM pipe cell can carry.
 */
export const normalizeCellChildrenForGfm = (cell: TableCell): TableCell['children'] =>
  normalizeNodes(cell.children) as TableCell['children'];
