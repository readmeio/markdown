import { Node, Paragraph, Parents, Table, TableCell, Text } from 'mdast';
import { visit, EXIT } from 'unist-util-visit';
import { Transform } from 'mdast-util-from-markdown';

import { phrasing } from 'mdast-util-phrasing';

const alignToStyle = (align: 'left' | 'center' | 'right' | null) => {
  if (!align) return align;

  return {
    type: 'mdxJsxAttribute',
    name: 'style',
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: `{ textAlign: \"${align}\" }`,
    },
  };
};

const isTableCell = (node: Node) => ['tableHead', 'tableCell'].includes(node.type);

const visitor = (table: Table, index: number, parent: Parents) => {
  let hasFlowContent = false;

  const tableCellVisitor = (cell: TableCell) => {
    const content =
      cell.children.length === 1 && cell.children[0].type === 'paragraph'
        ? (cell.children[0] as unknown as Paragraph).children[0]
        : cell.children[0];

    if (!phrasing(content)) {
      hasFlowContent = true;
      return EXIT;
    }

    visit(cell, 'text', (text: Text) => {
      if (text.value.match(/\n/)) {
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

  const head = {
    type: 'mdxJsxFlowElement',
    name: 'thead',
    children: [
      {
        type: 'mdxJsxFlowElement',
        name: 'tr',
        children: table.children[0].children.map((cell, index) => {
          return {
            type: 'mdxJsxFlowElement',
            name: 'th',
            children: cell.children,
            ...(styles[index] && { attributes: [styles[index]] }),
          };
        }),
      },
    ],
  };

  const body = {
    type: 'mdxJsxFlowElement',
    name: 'tbody',
    children: table.children.splice(1).map(row => {
      return {
        type: 'mdxJsxFlowElement',
        name: 'tr',
        children: row.children.map((cell, index) => {
          return {
            type: 'mdxJsxFlowElement',
            name: 'td',
            children: cell.children,
            ...(styles[index] && { attributes: [styles[index]] }),
          };
        }),
      };
    }),
  };
  const attributes = [
    {
      type: 'mdxJsxAttribute',
      name: 'align',
      value: {
        type: 'mdxJsxAttributeValueExpression',
        value: JSON.stringify(table.align),
      },
    },
  ];

  const jsx = {
    type: 'mdxJsxFlowElement',
    name: 'Table',
    ...(table.align.find(a => a) && { attributes }),
    children: [head, body],
  };

  // @ts-ignore
  parent.children[index] = jsx;
};

const isTable = (node: Node) => ['table', 'tableau'].includes(node.type);

const tablesToJsx = (): Transform => tree => {
  visit(tree, isTable, visitor);

  return tree;
};

export default tablesToJsx;
