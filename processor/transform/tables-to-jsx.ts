import { Parents, Table, TableCell, Text } from 'mdast';
import { visit, EXIT } from 'unist-util-visit';
import { Transform } from 'mdast-util-from-markdown';

import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { phrasing } from 'mdast-util-phrasing';

const visitor = (table: Table, index: number, parent: Parents) => {
  let hasFlowContent = false;

  const tableCellVisitor = (cell: TableCell) => {
    if (!phrasing(cell.children[0])) {
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

  visit(table, 'tableCell', tableCellVisitor);
  if (!hasFlowContent) return;

  const head = {
    type: 'mdxJsxFlowElement',
    name: 'thead',
    children: [
      {
        type: 'mdxJsxFlowElement',
        name: 'tr',
        children: table.children[0].children.map(cell => {
          return {
            type: 'mdxJsxFlowElement',
            name: 'th',
            children: cell.children,
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
        children: row.children.map(cell => {
          return {
            type: 'mdxJsxFlowElement',
            name: 'th',
            children: cell.children,
          };
        }),
      };
    }),
  };
  const proxy = fromMarkdown(`<div align={${JSON.stringify(table.align)}}></div>`, {
    extensions: [mdxJsx()],
    mdastExtensions: [mdxJsxFromMarkdown()],
  });

  // @ts-ignore
  const { attributes } = proxy.children[0];

  const jsx = {
    type: 'mdxJsxFlowElement',
    name: 'Table',
    attributes,
    children: [head, body],
  };

  // @ts-ignore
  parent.children[index] = jsx;
};

const tablesToJsx = (): Transform => tree => {
  visit(tree, 'table', visitor);

  return tree;
};

export default tablesToJsx;
