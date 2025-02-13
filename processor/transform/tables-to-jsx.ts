/* eslint-disable consistent-return */
import type { Literal, Node, Paragraph, Parents, Table, TableCell } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { phrasing } from 'mdast-util-phrasing';
import { visit, EXIT } from 'unist-util-visit';

const alignToStyle = (align: 'center' | 'left' | 'right' | null) => {
  if (!align) return align;

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

const visitor = (table: Table, index: number, parent: Parents) => {
  let hasFlowContent = false;

  const tableCellVisitor = (cell: TableCell) => {
    const content =
      cell.children.length === 1 && cell.children[0].type === 'paragraph'
        ? (cell.children[0] as unknown as Paragraph).children[0]
        : cell.children[0];

    // @note: Compatibility with RDMD. Ideally, I'd put this in a separate
    // transformer, but then there'd be some duplication.
    visit(cell, 'break', (_, breakIndex, breakParent) => {
      breakParent.children.splice(breakIndex, 1, { type: 'text', value: '\n' });
    });

    if (!phrasing(content) && content.type !== 'escape') {
      hasFlowContent = true;
      return EXIT;
    }

    visit(cell, isLiteral, (node: Literal) => {
      if (node.value.match(/\n/)) {
        hasFlowContent = true;
        return EXIT;
      }
    });
  };

  visit(table, isTableCell, tableCellVisitor);
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
            ...(styles[index] && { attributes: [styles[cellIndex]] }),
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
            ...(styles[index] && { attributes: [styles[cellIndex]] }),
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
};

const isTable = (node: Node) => ['table', 'tableau'].includes(node.type);

const tablesToJsx = (): Transform => tree => {
  visit(tree, isTable, visitor);

  return tree;
};

export default tablesToJsx;
