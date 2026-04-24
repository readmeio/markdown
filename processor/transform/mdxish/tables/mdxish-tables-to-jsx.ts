import type { MdxishTable, MdxishTableCell } from '../types';
import type { Literal, Node } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { phrasing } from 'mdast-util-phrasing';
import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../../enums';

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
    (tableNode, index, parent) => {
      const table = tableNode as MdxishTable;
      let hasFlowContent = false;

      visit(table, isTableCell, (cell: MdxishTableCell) => {
        if (hasFlowContent || cell.children.length === 0) return;

        visit(cell, 'break', (_, breakIndex, breakParent) => {
          breakParent.children.splice(breakIndex, 1, { type: 'text', value: '\n' });
        });

        // A cell with more than one paragraph child cannot be serialized as GFM
        // (pipe tables are single-line per cell), so force JSX <Table> output to
        // preserve paragraph separation.
        const paragraphCount = cell.children.filter(child => child.type === 'paragraph').length;
        if (paragraphCount > 1) {
          hasFlowContent = true;
          return;
        }

        // Check if any child is "flow" content (block-level) that requires JSX <Table>
        // serialization instead of GFM. `phrasing()` from mdast-util-phrasing returns
        // true for inline node types (text, emphasis, strong, link, etc.) which are
        // safe to keep in GFM cells.
        const hasFlowChild = cell.children.some(child => {
          if (child.type === 'paragraph' || child.type === 'plain' || child.type === 'escape') return false;
          if (child.type === NodeTypes.variable) return false;
          if (phrasing(child as Parameters<typeof phrasing>[0])) return false;
          if (child.type === 'html') {
            return SELF_CLOSING_JSX_REGEX.test((child as Literal).value);
          }

          return true;
        });

        if (hasFlowChild) {
          hasFlowContent = true;
        }

        if (!hasFlowContent) {
          visit(cell, isLiteral, (node: Literal) => {
            if (node.value.match(/\n/)) {
              hasFlowContent = true;
            }
          });
        }
      });

      if (!hasFlowContent) {
        table.type = 'table';
        return;
      }

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
