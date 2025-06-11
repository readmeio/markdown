/* eslint-disable consistent-return */
import type { Properties } from 'hast';
import type { BlockContent, Code, Link, Node, Parents, PhrasingContent, Table, TableCell, TableRow } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Callout, EmbedBlock, HTMLBlock, ImageBlock, Tableau } from 'types';

import { visit, SKIP } from 'unist-util-visit';

import { themes } from '../../components/Callout';
import { NodeTypes } from '../../enums';
import { mdast } from '../../lib';
import { getAttrs, isMDXElement, getChildren, formatHTML } from '../utils';

const types = {
  Anchor: 'link' as Link['type'],
  Callout: NodeTypes.callout,
  Code: 'code',
  CodeTabs: NodeTypes.codeTabs,
  EmbedBlock: NodeTypes['embed-block'],
  ImageBlock: NodeTypes.imageBlock,
  HTMLBlock: NodeTypes.htmlBlock,
  Table: 'table',
  Variable: NodeTypes.variable,
  TutorialTile: NodeTypes.tutorialTile,
};

enum TableNames {
  td = 'td',
  th = 'th',
  tr = 'tr',
}

const tableTypes = {
  [TableNames.tr]: 'tableRow',
  [TableNames.th]: 'tableCell',
  [TableNames.td]: 'tableCell',
};

interface Options {
  components: Record<string, string>;
  html?: boolean;
}

interface MdxJsxTableCell extends Omit<MdxJsxFlowElement, 'name'> {
  name: 'td' | 'th';
}

const isTableCell = (node: Node): node is MdxJsxTableCell => isMDXElement(node) && ['th', 'td'].includes(node.name);

const coerceJsxToMd =
  ({ components = {}, html = false } = {}) =>
  (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
    if (node.name in components) return;

    if (node.name === 'Code') {
      const { position } = node;
      const { value, lang = null, meta = null } = getAttrs<Pick<Code, 'lang' | 'meta' | 'value'>>(node);

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
      const {
        alt = '',
        align,
        border,
        caption,
        height,
        title = null,
        width,
        src,
      } = getAttrs<Pick<ImageBlock, 'align' | 'alt' | 'border' | 'caption' | 'height' | 'src' | 'title' | 'width'>>(
        node,
      );

      const attrs = {
        ...(align && { align }),
        ...(border && { border }),
        ...(src && { src }),
        ...(width && { width }),
        ...(height && { height }),
        alt,
        children: caption ? mdast(caption).children : node.children,
        title,
      };

      const mdNode: ImageBlock = {
        ...attrs,
        position,
        type: NodeTypes.imageBlock,
        data: {
          hName: 'img',
          // @ts-expect-error - @todo: figure out how to coerce RootContent[]
          hProperties: attrs,
        },
      };

      parent.children[index] = mdNode;
    } else if (node.name === 'HTMLBlock') {
      const { position } = node;
      const children = getChildren<HTMLBlock['children']>(node);
      const { runScripts } = getAttrs<Pick<HTMLBlock['data']['hProperties'], 'runScripts'>>(node);
      const htmlString = formatHTML(children.map(({ value }) => value).join(''));

      const mdNode: HTMLBlock = {
        position,
        children: [{ type: 'text', value: htmlString }],
        type: NodeTypes.htmlBlock,
        data: {
          hName: 'html-block',
          hProperties: {
            ...(runScripts && { runScripts }),
            html: htmlString,
          },
        },
      };

      parent.children[index] = mdNode;
    } else if (node.name === 'Table') {
      const { position } = node;
      const { align = [...new Array(node.children.length)].map(() => null) } = getAttrs<Pick<Table, 'align'>>(node);
      const children: TableRow[] = [];

      visit(node, { name: 'tr' } as Partial<MdxJsxFlowElement>, row => {
        const rowChildren: TableCell[] = [];

        visit(row, isTableCell, ({ name, children: cellChildren, position: cellPosition }) => {
          rowChildren.push({
            type: tableTypes[name],
            children: cellChildren,
            position: cellPosition,
          } as TableCell);
        });

        children.push({
          type: tableTypes[row.name],
          children: rowChildren,
          position: row.position,
        });
      });

      const mdNode: Tableau = {
        align,
        type: NodeTypes.tableau,
        position,
        children,
      };

      visit(mdNode, isMDXElement, coerceJsxToMd({ components, html }));

      parent.children[index] = mdNode;
      return SKIP;
    } else if (node.name === 'Callout') {
      const attrs = getAttrs<Callout['data']['hProperties']>(node);
      const { icon, empty = false } = getAttrs<Callout['data']['hProperties']>(node);
      const theme = attrs.theme || themes[icon] || 'default';

      const mdNode: Callout = {
        children: node.children as BlockContent[],
        type: NodeTypes.callout,
        data: {
          hName: node.name,
          hProperties: { icon, empty, theme },
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
    } else if (node.name === 'Anchor') {
      const hProperties = getAttrs<Properties>(node);

      if (hProperties.href) {
        hProperties.url = hProperties.href;
        delete hProperties.href;
      }

      // @ts-expect-error we don't have a mechanism to enforce the URL attribute type right now
      const mdNode: Link = {
        ...hProperties,
        children: node.children as PhrasingContent[],
        type: types[node.name],
        position: node.position,
      };

      parent.children[index] = mdNode;
    } else if (node.name in types) {
      const hProperties = getAttrs<Properties>(node);

      const mdNode: BlockContent = {
        children: node.children,
        type: types[node.name],
        data: {
          hName: node.name,
          ...(Object.keys(hProperties).length && { hProperties }),
        },
        position: node.position,
      };

      parent.children[index] = mdNode;
    }
  };

const readmeComponents = (opts: Options) => (): Transform => tree => {
  visit(tree, isMDXElement, coerceJsxToMd(opts));

  visit(tree, 'paragraph', (node, index, parent) => {
    // @ts-expect-error - the editor can create non-compliant tables!
    if (parent.type !== 'tableRow') return;

    // @ts-expect-error - the editor can create non-compliant tables!
    parent.children.splice(index, 1, ...node.children);
  });

  return tree;
};

export default readmeComponents;
