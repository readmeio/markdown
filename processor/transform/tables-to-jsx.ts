import { Parents, Table, Text } from 'mdast';
import { visit, EXIT } from 'unist-util-visit';
import { Transform } from 'mdast-util-from-markdown';

import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';

const visitor = (table: Table, index: number, parent: Parents) => {
  let hasNewlines = false;

  const tableCellVisitor = (text: Text) => {
    if (text.value.match(/\n/)) {
      hasNewlines = true;
      return EXIT;
    }
  };

  visit(table, 'text', tableCellVisitor);
  if (!hasNewlines) return;

  const head = {
    type: 'mdxJsxFlowElement',
    name: 'thead',
    children: [
      {
        type: 'mdxJsxFlowElement',
        name: 'tr',
        children: table.children[0].children.map((cell, idx) => {
          const proxy = fromMarkdown(`<div style={{ align: "${table.align[idx]}" }}></div>`, {
            extensions: [mdxJsx()],
            mdastExtensions: [mdxJsxFromMarkdown()],
          });
          // @ts-ignore
          const { attributes } = proxy.children[0];

          return {
            type: 'mdxJsxFlowElement',
            name: 'th',
            attributes,
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
        children: row.children.map((cell, idx) => {
          const proxy = fromMarkdown(`<div style={{ align: "${table.align[idx]}" }}></div>`, {
            extensions: [mdxJsx()],
            mdastExtensions: [mdxJsxFromMarkdown()],
          });
          // @ts-ignore
          const { attributes } = proxy.children[0];

          return {
            type: 'mdxJsxFlowElement',
            name: 'th',
            attributes,
            children: cell.children,
          };
        }),
      };
    }),
  };

  const jsx = {
    type: 'mdxJsxFlowElement',
    name: 'Table',
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
