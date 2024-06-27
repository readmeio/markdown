import { NodeTypes } from '../../enums';
import { BlockContent, Code, Parents, Table } from 'mdast';
import { Transform } from 'mdast-util-from-markdown';

import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { Callout, EmbedBlock, HTMLBlock, ImageBlock } from 'types';
import { visit } from 'unist-util-visit';

import { getAttrs, isMDXElement, getChildren, formatHTML } from '../utils';

const types = {
  Callout: NodeTypes['callout'],
  Code: 'code',
  CodeTabs: NodeTypes['codeTabs'],
  EmbedBlock: NodeTypes['embed-block'],
  Glossary: NodeTypes['glossary'],
  ImageBlock: NodeTypes['image-block'],
  HTMLBlock: NodeTypes.htmlBlock,
  Table: 'table',
  Variable: NodeTypes['variable'],
  td: 'tableCell',
  tr: 'tableRow',
  TutorialTile: NodeTypes.tutorialTile,
};

interface Options {
  components: Record<string, string>;
}

const coerceJsxToMd =
  ({ components = {} } = {}) =>
  (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
    if (node.name in components) return;

    if (node.name === 'Code') {
      const { position } = node;
      const { value, lang = null, meta = null } = getAttrs<Pick<Code, 'value' | 'lang' | 'meta'>>(node);

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
      const { alt = '', url, title = null } = getAttrs<Pick<ImageBlock, 'alt' | 'title' | 'url'>>(node);
      const attrs = getAttrs<ImageBlock['data']['hProperties']>(node);
      const mdNode: ImageBlock = {
        alt,
        position,
        title,
        type: NodeTypes.imageBlock,
        url: url || attrs.src,
        data: {
          hName: 'img',
          hProperties: attrs,
        },
      };

      parent.children[index] = mdNode;
    } else if (node.name === 'HTMLBlock') {
      const { position } = node;
      const children = getChildren<HTMLBlock['children']>(node);
      const { runScripts } = getAttrs<Pick<HTMLBlock['data']['hProperties'], 'runScripts'>>(node);
      const html = formatHTML(children.map(({ value }) => value).join(''));

      const mdNode: HTMLBlock = {
        position,
        children: [{ type: 'text', value: html }],
        type: NodeTypes.htmlBlock,
        data: {
          hName: 'html-block',
          hProperties: {
            ...(runScripts && { runScripts }),
            html,
          },
        },
      };

      parent.children[index] = mdNode;
    } else if (node.name === 'Table') {
      const { children, position } = node;
      const { align = [...new Array(node.children.length)].map(() => null) } = getAttrs<Pick<Table, 'align'>>(node);

      const mdNode: Table = {
        align,
        type: 'table',
        position,
        // @ts-ignore
        children,
      };

      parent.children[index] = mdNode;
    } else if (node.name === 'Callout') {
      const { icon, empty = false } = getAttrs<Callout['data']['hProperties']>(node);

      // @ts-ignore
      const mdNode: Callout = {
        children: node.children as any,
        type: NodeTypes.callout,
        data: {
          hName: node.name,
          hProperties: { icon, empty },
        },
        position: node.position,
      };

      parent.children[index] = mdNode;
    } else if (node.name === 'Embed') {
      const hProperties = getAttrs<EmbedBlock['data']['hProperties']>(node);

      const mdNode: EmbedBlock = {
        type: NodeTypes.embedBlock,
        title: hProperties.title,
        data: {
          hName: 'embed',
          hProperties,
        },
        position: node.position,
      };

      parent.children[index] = mdNode;
    } else if (node.name in types) {
      const hProperties = getAttrs<BlockContent['data']['hProperties']>(node);

      const mdNode: BlockContent = {
        children: node.children,
        type: types[node.name],
        ...(['tr', 'td'].includes(node.name)
          ? {}
          : {
              data: {
                hName: node.name,
                ...(Object.keys(hProperties).length && { hProperties }),
              },
            }),
        position: node.position,
      };

      parent.children[index] = mdNode;
    }
  };

const readmeComponents = (opts: Options) => (): Transform => tree => {
  visit(tree, isMDXElement, coerceJsxToMd(opts));

  visit(tree, 'paragraph', (node, index, parent) => {
    // @ts-ignore
    if (parent.type !== 'tableRow') return;

    // @ts-ignore
    parent.children.splice(index, 1, ...node.children);
  });

  return tree;
};

export default readmeComponents;
