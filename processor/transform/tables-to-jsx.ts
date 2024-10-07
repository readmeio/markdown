import { Literal, Node, Paragraph, Parents, Table, TableCell, Text } from 'mdast';
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

const isLiteral = (node: Node): node is Literal => 'value' in node;
const isText = (node: Node): node is Text => node.type === 'text';

const visitor = (table: Table, index: number, parent: Parents) => {
  let hasFlowContent = false;

  const tableCellVisitor = (cell: TableCell) => {
    const content =
      cell.children.length === 1 && cell.children[0].type === 'paragraph'
        ? (cell.children[0] as unknown as Paragraph).children[0]
        : cell.children[0];

    // @note: Compatibility with RDMD. Ideally, I'd put this in a separate
    // transformer, but then there'd be some duplication.
    visit(cell, 'break', (_, index, parent) => {
      if (index > 0 && isText(parent.children[index - 1])) {
        parent.children[index - 1].value += '\n';
        parent.children.splice(index, 1);

        return index;
      } else {
        parent.children.splice(index, 1, { type: 'text', value: '' });
      }
    });

    console.log(JSON.stringify({ cell }, null, 2));

    if (!phrasing(content)) {
      hasFlowContent = true;
      return EXIT;
    }

    visit(cell, isLiteral, (node: Literal) => {
      if (node.value.match(/\n/)) {
        if (node.type === 'inlineCode') {
          node.type = 'code';
        }

        hasFlowContent = true;
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
            children: [{ type: 'paragraph', children: cell.children }],
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
