import { BlockContent, Code, Image, Paragraph, Parents, Table, TableRow } from 'mdast';
import { Transform } from 'mdast-util-from-markdown';

import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { Callout, CodeTabs } from 'types';
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

const attributes = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement) =>
  jsx.attributes.reduce((memo, attr) => {
    if ('name' in attr) {
      memo[attr.name] = attr.value;
    }

    return memo;
  }, {} as T);

interface Options {
  components: Record<string, string>;
}

const coerceJsxToMd =
  ({ components = {} } = {}) =>
  (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
    if (node.name in components) return;

    if (node.name === 'Code') {
      const { position } = node;
      const { value, lang = null, meta = null } = attributes<Pick<Code, 'value' | 'lang' | 'meta'>>(node);

      const mdNode: Code = {
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
      const { alt = '', src, title = null } = attributes<Pick<Image, 'alt' | 'title'> & { src: string }>(node);

      const mdNode: Image = {
        alt,
        position,
        title,
        type: 'image',
        url: src,
      };

      parent.children[index] = mdNode;
    } else if (node.name === 'Table') {
      const { children, position } = node;
      const { align = [...new Array(node.children.length)].map(() => null) } = attributes<Pick<Table, 'align'>>(node);

      const mdNode: Table = {
        align,
        type: 'table',
        position,
        // @ts-ignore
        children,
      };

      parent.children[index] = mdNode;
    } else if (node.name in types) {
      const hProperties = attributes(node);

      // @ts-ignore
      const mdNode: Callout | CodeTabs = {
        children: node.children as any,
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
  };

const readmeComponents = (opts: Options) => (): Transform => tree => {
  // @TODO: unist-util-visit does a really good job with types, **but** it
  // can't seem to infer allowing multiple types passed to the visitor
  // function. Otherwise, I would have these two function calls be one?
  visit(tree, 'mdxJsxFlowElement', coerceJsxToMd(opts));
  visit(tree, 'mdxJsxTextElement', coerceJsxToMd(opts));

  visit(tree, 'paragraph', (node, index, parent) => {
    // @ts-ignore
    if (parent.type !== 'tableRow') return;

    // @ts-ignore
    parent.children.splice(index, 1, ...node.children);
  });

  return tree;
};

export default readmeComponents;
