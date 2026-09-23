import type { Literal, Node, Nodes, Table, TableCell } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { phrasing } from 'mdast-util-phrasing';
import { EXIT, visit } from 'unist-util-visit';

import { NodeTypes } from '../../../../enums';

import { hasChildren, normalizeCellChildrenForGfm } from './gfm-cell-normalization';

const SELF_CLOSING_JSX_REGEX = /^\s*<[A-Z][^>]*\/>\s*$/;

type CellAlign = 'center' | 'left' | 'right' | null;

/**
 * Builds a cell's `style={{ ... }}` attribute. `left` is the browser default so it is
 * omitted; a width only ever lands on the header row, which is enough to size the column.
 */
const cellStyle = (align: CellAlign, width: string | null = null) => {
  const declarations: string[] = [];
  if (align && align !== 'left') declarations.push(`textAlign: ${JSON.stringify(align)}`);
  if (width) declarations.push(`width: ${JSON.stringify(width)}`);
  if (declarations.length === 0) return null;

  return {
    type: 'mdxJsxAttribute',
    name: 'style',
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: `{ ${declarations.join(', ')} }`,
    },
  };
};

const isTableCell = (node: Node) => ['tableHead', 'tableCell'].includes(node.type);

const isLiteral = (node: Node): node is Literal => 'value' in node;

/**
 * Block-level content that a single-line GFM cell cannot hold. `phrasing()` returns true
 * for inline types (text, emphasis, strong, link…), which are safe to keep.
 */
const isFlowChild = (child: Nodes): boolean => {
  if (child.type === 'paragraph' || child.type === 'plain' || child.type === 'escape') return false;
  if (child.type === NodeTypes.variable) return false;
  if (phrasing(child)) return false;
  if (child.type === 'html') return SELF_CLOSING_JSX_REGEX.test(child.value);

  return true;
};

/** A newline in a normalized cell (e.g. inside `inlineCode`) has no inline equivalent. */
const containsLiteralNewline = (nodes: Node[]): boolean =>
  nodes.some(
    node => (isLiteral(node) && node.value.includes('\n')) || (hasChildren(node) && containsLiteralNewline(node.children)),
  );

/** True when normalized cell content survives a single-line GFM pipe cell without losing structure. */
const canCellBeGfm = (children: TableCell['children']): boolean => {
  // Multiple paragraphs are distinct blocks; a single-line cell cannot keep them apart.
  if (children.filter(child => child.type === 'paragraph').length > 1) return false;
  if (children.some(isFlowChild)) return false;

  return !containsLiteralNewline(children);
};

/** On the promote path a `break` would serialize as a dangling `\`, so collapse it to a newline. */
const flattenBreaksToNewlines = (cell: TableCell): void => {
  visit(cell, 'break', (_, index, parent) => {
    parent.children.splice(index, 1, { type: 'text', value: '\n' });
  });
};

/**
 * Mdxish-specific version of `tablesToJsx`. Differs from the shared MDX version:
 *
 * - Excludes `html` nodes from triggering JSX conversion because raw HTML
 *   inside JSX `<Table>` breaks remarkMdx parsing on the deserialization roundtrip.
 * - Skips empty cells instead of aborting the entire visit so that flow content
 *   in later cells is still detected.
 */
const mdxishTablesToJsx = (): Transform => tree => {
  visit(
    tree,
    (node: Node) => ['table', 'tableau'].includes(node.type),
    (table: Table, index, parent) => {
      const gfmCells: [TableCell, TableCell['children']][] = [];
      let requiresJsxTable = false;

      visit(table, isTableCell, (cell: TableCell) => {
        const normalized = normalizeCellChildrenForGfm(cell);
        if (!canCellBeGfm(normalized)) {
          requiresJsxTable = true;
          return EXIT;
        }
        gfmCells.push([cell, normalized]);
        return undefined;
      });

      const widths = table.data?.widths ?? [];
      const hasWidths = widths.some(Boolean);
      const stayLowercase = table.data?.lowercaseTable === true;

      // We transform to GFM tables if:
      // 1. If it doesn't contain complex elements that the syntax can't represent
      // 2. The original table is not lowercase HTML <table>, because we want to
      // preserve original tables as much as possible
      // 3. No column carries a width, which GFM pipe syntax cannot express
      if (!requiresJsxTable && !stayLowercase && !hasWidths) {
        gfmCells.forEach(([cell, children]) => {
          cell.children = children;
        });
        table.type = 'table';
        return;
      }

      // Nothing to build a JSX table from; leave the empty node to the GFM stringifier.
      const [headerRow, ...bodyRows] = table.children;
      if (!headerRow) return;

      visit(table, isTableCell, flattenBreaksToNewlines);

      const headerStyles = table.align.map((align, i) => cellStyle(align, widths[i] ?? null));
      const bodyStyles = table.align.map(align => cellStyle(align));

      const head: MdxJsxFlowElement = {
        attributes: [],
        type: 'mdxJsxFlowElement',
        name: 'thead',
        children: [
          {
            attributes: [],
            type: 'mdxJsxFlowElement',
            name: 'tr',
            children: headerRow.children.map((cell, cellIndex) => {
              return {
                attributes: [],
                type: 'mdxJsxFlowElement',
                name: 'th',
                children: cell.children,
                ...(headerStyles[cellIndex] && { attributes: [headerStyles[cellIndex]] }),
              } as MdxJsxFlowElement;
            }),
          },
        ],
      };

      const body: MdxJsxFlowElement = {
        attributes: [],
        type: 'mdxJsxFlowElement',
        name: 'tbody',
        children: bodyRows.map(row => {
          return {
            attributes: [],
            type: 'mdxJsxFlowElement',
            name: 'tr',
            children: row.children.map((cell, cellIndex) => {
              return {
                type: 'mdxJsxFlowElement',
                name: 'td',
                children: cell.children,
                ...(bodyStyles[cellIndex] && { attributes: [bodyStyles[cellIndex]] }),
              };
            }),
          } as MdxJsxFlowElement;
        }),
      };

      const attributes: MdxJsxFlowElement['attributes'] = [
        {
          type: 'mdxJsxAttribute',
          name: 'align',
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: JSON.stringify(table.align),
          },
        },
      ];

      const jsx: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: stayLowercase ? 'table' : 'Table',
        attributes: !stayLowercase && table.align.find(a => a) ? attributes : [],
        children: [head, body],
      };

      parent.children[index] = jsx;
    },
  );

  return tree;
};

export default mdxishTablesToJsx;
