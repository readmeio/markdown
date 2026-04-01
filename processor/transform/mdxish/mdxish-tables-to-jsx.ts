import type { Literal, Node, Paragraph, Table, TableCell } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { phrasing } from 'mdast-util-phrasing';
import { visit } from 'unist-util-visit';

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
  visit(tree, (node: Node) => ['table', 'tableau'].includes(node.type), (table: Table, index, parent) => {
    let hasFlowContent = false;

    visit(table, isTableCell, (cell: TableCell) => {
      if (hasFlowContent || cell.children.length === 0) return;

      const content =
        cell.children.length === 1 && cell.children[0].type === 'paragraph'
          ? (cell.children[0] as unknown as Paragraph).children[0]
          : cell.children[0];

      if (!content) return undefined;

      visit(cell, 'break', (_, breakIndex, breakParent) => {
        breakParent.children.splice(breakIndex, 1, { type: 'text', value: '\n' });
      });

      if (!(phrasing(content) || content.type === 'plain') && content.type !== 'escape') {
        // Plain HTML (e.g. <div>Hello</div>) is skipped here — it stays in GFM cells fine.
        // But self-closing JSX components (e.g. <Image src="..." caption="..." />) serialize
        // with newlines that break GFM cells, so they must trigger JSX <Table> serialization.
        const isPlainHtml = content.type === 'html' && !SELF_CLOSING_JSX_REGEX.test((content as Literal).value);
        if (!isPlainHtml) {
          hasFlowContent = true;
        }
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
  });

  return tree;
};

export default mdxishTablesToJsx;
