import type { Node, Parents, Root, Table, TableCell, TableRow } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { getAttrs, isMDXElement } from '../../utils';
import { extractText } from '../extract-text';

import mdxishComponentBlocks from './mdxish-component-blocks';

interface MdxJsxTableCell extends Omit<MdxJsxFlowElement, 'name'> {
  name: 'td' | 'th';
}

const isTableCell = (node: Node): node is MdxJsxTableCell => isMDXElement(node) && ['th', 'td'].includes(node.name);

const tableTypes = {
  tr: 'tableRow',
  th: 'tableCell',
  td: 'tableCell',
};

const mdCellProcessor = unified().use(remarkParse).use(remarkGfm);
const tableNodeProcessor = unified().use(remarkParse).use(remarkMdx).use(mdxishComponentBlocks);

/**
 * Check if children are only text nodes that might contain markdown
 */
const isTextOnly = (children: unknown[]): boolean => {
  return children.every(child => {
    if (child && typeof child === 'object' && 'type' in child) {
      if (child.type === 'text') return true;
      if (child.type === 'mdxJsxTextElement' && 'children' in child && Array.isArray(child.children)) {
        return child.children.every((c: unknown) => c && typeof c === 'object' && 'type' in c && c.type === 'text');
      }
    }
    return false;
  });
};

/**
 * Convenience wrapper that extracts text content from an array of children nodes.
 */
const extractTextFromChildren = (children: unknown[]): string => {
  return children
    .map(child => {
      if (child && typeof child === 'object' && 'type' in child) {
        return extractText(child as Parameters<typeof extractText>[0]);
      }
      return '';
    })
    .join('');
};

/**
 * Parse markdown text into MDAST nodes
 */
const parseMarkdown = (text: string): Node[] => {
  const tree = mdCellProcessor.runSync(mdCellProcessor.parse(text)) as Root;
  return (tree.children || []) as Node[];
};

/**
 * Process a Table node (either MDX JSX element or parsed from HTML) and convert to markdown table
 */
const processTableNode = (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents): void => {
  if (node.name !== 'Table') return;

  const { position } = node;
  const { align: alignAttr } = getAttrs<Pick<Table, 'align'>>(node);
  const align = Array.isArray(alignAttr) ? alignAttr : null;

  const children: TableRow[] = [];

  // Process rows from thead and tbody
  // The structure is: Table -> thead/tbody -> tr -> td/th
  const processRow = (row: MdxJsxFlowElement) => {
    const rowChildren: TableCell[] = [];

    visit(row, isTableCell, ({ name, children: cellChildren, position: cellPosition }) => {
      let parsedChildren: TableCell['children'] = cellChildren as TableCell['children'];

      // If cell contains only text nodes, try to re-parse as markdown
      if (isTextOnly(cellChildren as unknown[])) {
        const textContent = extractTextFromChildren(cellChildren as unknown[]);
        if (textContent.trim()) {
          try {
            const parsed = parseMarkdown(textContent);
            // If parsing produced nodes, use them; otherwise keep original
            if (parsed.length > 0) {
              // Flatten paragraphs if they contain only phrasing content
              parsedChildren = parsed.flatMap(parsedNode => {
                if (parsedNode.type === 'paragraph' && 'children' in parsedNode && parsedNode.children) {
                  return parsedNode.children;
                }
                return [parsedNode];
              }) as TableCell['children'];
            }
          } catch {
            // If parsing fails, keep original children
          }
        }
      }

      rowChildren.push({
        type: tableTypes[name],
        children: parsedChildren,
        position: cellPosition,
      } as TableCell);
    });

    children.push({
      type: tableTypes[row.name],
      children: rowChildren,
      position: row.position,
    });
  };

  // Visit thead and tbody, then find tr elements within them
  visit(node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name === 'thead' || child.name === 'tbody') {
      visit(child, isMDXElement, (row: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (row.name === 'tr' && row.type === 'mdxJsxFlowElement') {
          processRow(row);
        }
      });
    }
  });

  const firstRow = children[0];
  const columnCount = firstRow?.children?.length || 0;
  const alignArray: Table['align'][number][] =
    align && columnCount > 0
      ? align.slice(0, columnCount).concat(new Array(Math.max(0, columnCount - align.length)).fill(null))
      : new Array(columnCount).fill(null);

  const mdNode: Table = {
    align: alignArray,
    type: 'table',
    position,
    children,
  };

  parent.children[index] = mdNode;
};

/**
 * Converts JSX Table elements to markdown table nodes and re-parses markdown in cells.
 *
 * The jsxTable micromark tokenizer captures `<Table>...</Table>` as a single html node,
 * preventing CommonMark HTML block type 6 from fragmenting it at blank lines. This
 * transformer then re-parses the html node with remarkMdx to produce proper JSX AST nodes
 * and converts them to MDAST table/tableRow/tableCell nodes.
 */
const mdxishTables = (): Transform => tree => {
  visit(tree, 'html', (node, index, parent) => {
    if (typeof index !== 'number' || !parent || !('children' in parent)) return;
    if (!node.value.startsWith('<Table')) return;

    try {
      const parsed = tableNodeProcessor.runSync(tableNodeProcessor.parse(node.value)) as Root;

      visit(parsed, isMDXElement, (tableNode: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (tableNode.name === 'Table') {
          processTableNode(tableNode, index, parent as Parents);
        }
      });
    } catch {
      // If parsing fails, leave the node as-is
    }
  });

  return tree;
};

export default mdxishTables;
