import { BlockContent, Paragraph, Root, TableRow } from 'mdast';
import { MdxJsxFlowElement } from 'mdast-util-mdx';
import { visit } from 'unist-util-visit';

const types = {
  Callout: 'rdme-callout',
  Code: 'code',
  CodeTabs: 'code-tabs',
  Image: 'image',
  Table: 'table',
  tr: 'tableRow',
  td: 'tableCell',
};

const attributes = (jsx: MdxJsxFlowElement) =>
  jsx.attributes.reduce((memo, attr) => {
    memo[attr.name] = attr.value;
    return memo;
  }, {});

const readmeComponents =
  ({ components = {} } = {}) =>
  (tree: Root) => {
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node, index, parent) => {
      if (node.name in components) return;

      if (node.name === 'Code') {
        const { position } = node;
        const { value, lang = null, meta = null } = attributes(node);

        const mdNode = {
          lang,
          meta,
          position,
          type: 'code',
          value,
          data: {
            hProperties: { value, lang, meta },
          },
        };

        parent.children[index] = mdNode;
      } else if (node.name === 'Image') {
        const { position } = node;
        const { alt = '', src, title = null } = attributes(node);

        const mdNode = {
          alt,
          position,
          title,
          type: 'image',
          url: src,
        };

        parent.children[index] = mdNode;
      } else if (node.name === 'Table') {
        const { children, position } = node;
        const { align = [...new Array(node.children.length)].map(() => null) } = attributes(node);

        const mdNode = {
          align,
          type: 'table',
          position,
          children,
        };

        parent.children[index] = mdNode;
      } else if (node.name in types) {
        const hProperties = attributes(node);

        const mdNode = {
          children: node.children,
          type: types[node.name],
          ...(['tr', 'td'].includes(node.name)
            ? {}
            : {
                data: {
                  hName: node.name,
                  ...(Object.keys(hProperties).length ? { hProperties } : {}),
                },
              }),
          position: node.position,
        };

        parent.children[index] = mdNode;
      }
    });

    visit(tree, 'paragraph', (node: Paragraph, index: number, parent: BlockContent | TableRow) => {
      if (parent.type !== 'tableRow') return;

      // @ts-ignore
      parent.children.splice(index, 1, ...node.children);
    });

    return tree;
  };

export default readmeComponents;
