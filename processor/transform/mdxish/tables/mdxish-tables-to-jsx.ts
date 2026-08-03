import type { Literal, Node, Nodes, Table, TableCell } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { phrasing } from 'mdast-util-phrasing';
import { EXIT, visit } from 'unist-util-visit';

import { NodeTypes } from '../../../../enums';

import { flattenBreaksToNewlines, isBareListMarker, normalizeCellForGfm } from './gfm-cell-normalization';

const SELF_CLOSING_JSX_REGEX = /^\s*<[A-Z][^>]*\/>\s*$/;

const alignToStyle = (align: 'center' | 'left' | 'right' | null) => {
  if (!align || align === 'left') return null;

  return {
    type: 'mdxJsxAttribute',
    name: 'style',
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: `{ textAlign: "${align}" }`,
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
  if (isBareListMarker(child)) return false;
  if (child.type === 'html') return SELF_CLOSING_JSX_REGEX.test(child.value);

  return true;
};

/**
 * Newlines that survive {@link normalizeCellForGfm}. Only `text` newlines become `<br />`;
 * one inside `inlineCode` or raw `html` is part of the value and has no inline equivalent.
 */
const hasUnrepresentableNewline = (cell: TableCell): boolean => {
  let found = false;
  visit(cell, isLiteral, (node: Literal & Node) => {
    if (node.type !== 'text' && node.value.includes('\n')) {
      found = true;
      return EXIT;
    }
    return undefined;
  });
  return found;
};

/** True when a cell's content round-trips through a GFM pipe cell without losing structure. */
const canCellBeGfm = (cell: TableCell): boolean => {
  if (cell.children.length === 0) return true;

  // Multiple paragraphs are distinct blocks; a single-line cell cannot keep them apart.
  if (cell.children.filter(child => child.type === 'paragraph').length > 1) return false;
  if (cell.children.some(isFlowChild)) return false;

  return !hasUnrepresentableNewline(cell);
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
      let hasFlowContent = false;

      visit(table, isTableCell, (cell: TableCell) => {
        if (canCellBeGfm(cell)) return undefined;
        hasFlowContent = true;
        return EXIT;
      });

      if (!hasFlowContent) {
        visit(table, isTableCell, normalizeCellForGfm);
        table.type = 'table';
        return;
      }

      visit(table, isTableCell, flattenBreaksToNewlines);

      const styles = table.align.map(alignToStyle);

      const head: MdxJsxFlowElement = {
        attributes: [],
        type: 'mdxJsxFlowElement',
        name: 'thead',
        children: [
          {
            attributes: [],
            type: 'mdxJsxFlowElement',
            name: 'tr',
            children: table.children[0].children.map((cell, cellIndex) => {
              return {
                attributes: [],
                type: 'mdxJsxFlowElement',
                name: 'th',
                children: cell.children,
                ...(styles[cellIndex] && { attributes: [styles[cellIndex]] }),
              } as MdxJsxFlowElement;
            }),
          },
        ],
      };

      const body: MdxJsxFlowElement = {
        attributes: [],
        type: 'mdxJsxFlowElement',
        name: 'tbody',
        children: table.children.splice(1).map(row => {
          return {
            attributes: [],
            type: 'mdxJsxFlowElement',
            name: 'tr',
            children: row.children.map((cell, cellIndex) => {
              return {
                type: 'mdxJsxFlowElement',
                name: 'td',
                children: cell.children,
                ...(styles[cellIndex] && { attributes: [styles[cellIndex]] }),
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
        name: 'Table',
        attributes: table.align.find(a => a) ? attributes : [],
        children: [head, body],
      };

      parent.children[index] = jsx;
    },
  );

  return tree;
};

export default mdxishTablesToJsx;
