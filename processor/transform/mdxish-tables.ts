/* eslint-disable consistent-return */
import type { Node, Parents, Root, Table, TableCell, TableRow } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit, SKIP } from 'unist-util-visit';

import { getAttrs, isMDXElement } from '../utils';

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
 * Extract text content from children nodes
 */
const extractText = (children: unknown[]): string => {
  return children
    .map(child => {
      if (child && typeof child === 'object' && 'type' in child) {
        if (child.type === 'text' && 'value' in child && typeof child.value === 'string') {
          return child.value;
        }
        if (child.type === 'mdxJsxTextElement' && 'children' in child && Array.isArray(child.children)) {
          return extractText(child.children);
        }
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
        const textContent = extractText(cellChildren as unknown[]);
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
 * Transformer to convert JSX Table elements to markdown table nodes
 * and re-parse markdown content in table cells.
 *
 * The old MDX pipeline relies on remarkMdx to convert the table and its markdown content into MDX JSX elements.
 * Since mdxish does not use remarkMdx, we have to do it manually.
 * The workaround is to parse cell contents through remarkParse and remarkGfm to convert them to MDX JSX elements.
 */
const mdxishTables = (): Transform => tree => {
  // First, handle MDX JSX elements (already converted by mdxishComponentBlocks)
  visit(tree, isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement, index, parent: Parents) => {
    if (node.name === 'Table') {
      processTableNode(node, index, parent);
      return SKIP;
    }
  });

  // Also handle HTML and raw nodes that contain Table tags (in case mdxishComponentBlocks didn't convert them)
  // This happens when the entire <Table>...</Table> block is in a single HTML node, which mdxishComponentBlocks
  // doesn't handle (it only handles split nodes: opening tag, content paragraph, closing tag)
  const handleTableInNode = (node: { type: string; value?: string }, index: number, parent: Parents) => {
    if (typeof index !== 'number' || !parent || !('children' in parent)) return;
    if (typeof node.value !== 'string') return;

    if (!node.value.includes('<Table') || !node.value.includes('</Table>')) return;

    try {
      // Parse the HTML content with remarkMdx and mdxishComponentBlocks to convert it to MDX JSX elements
      // This creates a proper AST that we can then process
      const parsed = tableNodeProcessor.runSync(tableNodeProcessor.parse(node.value)) as Root;

      // Find the Table element in the parsed result and process it
      visit(parsed, isMDXElement, (tableNode: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (tableNode.name === 'Table') {
          // Process the table and replace the HTML node with a markdown table node
          processTableNode(tableNode, index, parent);
        }
      });
    } catch {
      // If parsing fails, leave the node as-is
    }
  };

  // Handle HTML nodes (created by remark-parse for HTML blocks)
  visit(tree, 'html', (node, index, parent) => {
    if (typeof index === 'number' && parent && 'children' in parent) {
      handleTableInNode(node, index, parent as Parents);
    }
  });

  // Handle raw nodes (created by remark-parse for certain HTML structures)
  visit(tree, 'raw', (node, index, parent) => {
    if (typeof index === 'number' && parent && 'children' in parent) {
      handleTableInNode(node, index, parent as Parents);
    }
  });

  return tree;
};

export default mdxishTables;
