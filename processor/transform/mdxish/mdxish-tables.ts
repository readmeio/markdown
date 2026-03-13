import type { Node, Parents, Root, Table, TableCell, TableRow } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { phrasing } from 'mdast-util-phrasing';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { getAttrs, isMDXElement } from '../../utils';
import calloutTransformer from '../callouts';
import { extractText } from '../extract-text';
import gemojiTransformer from '../gemoji+';

import normalizeEmphasisAST from './normalize-malformed-md-syntax';

interface MdxJsxTableCell extends Omit<MdxJsxFlowElement, 'name'> {
  name: 'td' | 'th';
}

const isTableCell = (node: Node): node is MdxJsxTableCell => isMDXElement(node) && ['th', 'td'].includes(node.name);

const tableTypes = {
  tr: 'tableRow',
  th: 'tableCell',
  td: 'tableCell',
};

const tableNodeProcessor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(normalizeEmphasisAST)
  .use([calloutTransformer, gemojiTransformer])
  .use(remarkGfm);

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
 * Returns true if any node in the array is block-level (non-phrasing) content.
 */
const hasFlowContent = (nodes: Node[]): boolean => {
  return nodes.some(node => !phrasing(node) && node.type !== 'paragraph');
};

/**
 * Process a Table node: re-parse text-only cell content, then output as
 * a markdown table (phrasing-only) or keep as JSX <Table> (has flow content).
 */
const processTableNode = (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents): void => {
  if (node.name !== 'Table') return;

  const { position } = node;
  const { align: alignAttr } = getAttrs<Pick<Table, 'align'>>(node);
  const align = Array.isArray(alignAttr) ? alignAttr : null;

  let tableHasFlowContent = false;

  // Re-parse text-only cells through markdown and detect flow content
  visit(node, isTableCell, (cell: MdxJsxTableCell) => {
    if (!isTextOnly(cell.children as unknown[])) return;

    const textContent = extractTextFromChildren(cell.children as unknown[]);
    if (!textContent.trim()) return;

    // Since now we are using remarkMdx, which can fail and error, we need to
    // gate this behind a try/catch to ensure that malformed syntaxes do not
    // crash the page
    try {
      const parsed = tableNodeProcessor.runSync(tableNodeProcessor.parse(textContent)) as Root;
      if (parsed.children.length > 0) {
        cell.children = parsed.children as MdxJsxTableCell['children'];
        if (hasFlowContent(parsed.children as Node[])) {
          tableHasFlowContent = true;
        }
      }
    } catch {
      // If parsing fails, keep original children
    }
  });

  if (tableHasFlowContent) {
    // Cell content has block-level nodes (callouts, code blocks, etc.) — keep as JSX
    // so remarkRehype can handle the flow content through mdxJsxElementHandler
    parent.children[index] = { ...node, position } as unknown as typeof parent.children[number];
    return;
  }

  // All cells are phrasing-only — convert to markdown table
  const children: TableRow[] = [];

  visit(node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name === 'thead' || child.name === 'tbody') {
      visit(child, isMDXElement, (row: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (row.name === 'tr' && row.type === 'mdxJsxFlowElement') {
          const rowChildren: TableCell[] = [];

          visit(row, isTableCell, ({ name, children: cellChildren, position: cellPosition }) => {
            const parsedChildren = (cellChildren as Node[]).flatMap(parsedNode => {
              if (parsedNode.type === 'paragraph' && 'children' in parsedNode && parsedNode.children) {
                return parsedNode.children;
              }
              return [parsedNode];
            });

            rowChildren.push({
              type: tableTypes[name],
              children: parsedChildren,
              position: cellPosition,
            } as TableCell);
          });

          children.push({
            type: 'tableRow' as const,
            children: rowChildren,
            position: row.position,
          });
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
 *
 * When cell content contains block-level nodes (callouts, code blocks, etc.), the table
 * is kept as a JSX <Table> element so that remarkRehype can properly handle the flow content.
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
