/**
 * Unified plugin that transforms `magicBlock` MDAST nodes into final nodes.
 *
 * This replaces the magicBlockRestorer plugin by working directly with
 * parsed `magicBlock` nodes from the micromark tokenizer instead of
 * finding placeholder tokens.
 */
import type { MagicBlockNode } from '../../../lib/mdast-util/magic-block/types';
import type { Root as MdastRoot, RootContent, Parent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';


import { toAttributes } from '../../utils';

interface MdastNode {
  [key: string]: unknown;
  children?: MdastNode[];
  type: string;
}

/**
 * Base interface for magic block JSON data.
 */
interface MagicBlockJson {
  [key: string]: unknown;
  sidebar?: boolean;
}

interface CodeBlockJson extends MagicBlockJson {
  codes: { code: string; language: string; name?: string }[];
}

interface ApiHeaderJson extends MagicBlockJson {
  level?: number;
  title?: string;
}

interface ImageBlockJson extends MagicBlockJson {
  images: {
    align?: string;
    border?: boolean;
    caption?: string;
    image?: [string, string?, string?];
    sizing?: string;
  }[];
}

interface CalloutJson extends MagicBlockJson {
  body?: string;
  icon?: string;
  title?: string;
  type?: string | [string, string];
}

interface ParametersJson extends MagicBlockJson {
  align?: string[];
  cols: number;
  data: Record<string, string>;
  rows: number;
}

interface EmbedJson extends MagicBlockJson {
  html?: boolean;
  provider?: string;
  title?: string | null;
  url: string;
}

interface HtmlJson extends MagicBlockJson {
  html: string;
}

interface RecipeJson extends MagicBlockJson {
  backgroundColor?: string;
  emoji?: string;
  id?: string;
  link?: string;
  slug: string;
  title: string;
}

export interface MagicBlockTransformerOptions {
  compatibilityMode?: boolean;
  safeMode?: boolean;
}

/**
 * Wraps a node in a "pinned" container if sidebar: true is set.
 */
const wrapPinnedBlocks = (node: MdastNode, data: MagicBlockJson): MdastNode => {
  if (!data.sidebar) return node;
  return {
    children: [node],
    data: { className: 'pin', hName: 'rdme-pin' },
    type: 'rdme-pin',
  };
};

/**
 * Named size presets for image widths.
 */
const imgSizeValues: Record<string, string> = {
  full: '100%',
  original: 'auto',
};

/**
 * Proxy that resolves image sizing values.
 */
const imgWidthBySize = new Proxy(imgSizeValues, {
  get: (widths, size: string) => (size?.match(/^\d+$/) ? `${size}%` : size in widths ? widths[size] : size),
});

const textToInline = (text: string): MdastNode[] => [{ type: 'text', value: text }];
const textToBlock = (text: string): MdastNode[] => [{ children: textToInline(text), type: 'paragraph' }];

const contentParser = unified().use(remarkParse).use(remarkGfm);

const parseTableCell = (text: string): MdastNode[] => {
  if (!text.trim()) return [{ type: 'text', value: '' }];
  const tree = contentParser.runSync(contentParser.parse(text)) as MdastRoot;

  if (tree.children.length > 1) {
    return tree.children as MdastNode[];
  }

  return tree.children.flatMap(n =>
    n.type === 'paragraph' && 'children' in n ? (n.children as MdastNode[]) : [n as MdastNode],
  );
};

const parseBlock = (text: string): MdastNode[] => {
  if (!text.trim()) return [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }] as MdastNode[];
  const tree = contentParser.runSync(contentParser.parse(text)) as MdastRoot;
  return tree.children as MdastNode[];
};

/**
 * Transform a magicBlock node into final MDAST nodes.
 */
function transformMagicBlock(
  blockType: string,
  data: MagicBlockJson,
  options: MagicBlockTransformerOptions = {},
): MdastNode[] {
  const { compatibilityMode = false, safeMode = false } = options;

  if (Object.keys(data).length < 1) return [];

  switch (blockType) {
    case 'code': {
      const codeJson = data as CodeBlockJson;
      const children = codeJson.codes.map(obj => ({
        className: 'tab-panel',
        data: { hName: 'code', hProperties: { lang: obj.language, meta: obj.name || null } },
        lang: obj.language,
        meta: obj.name || null,
        type: 'code',
        value: obj.code.trim(),
      }));

      if (children.length === 1) {
        if (!children[0].value) return [];
        if (children[0].meta) return [wrapPinnedBlocks(children[0], data)];
      }

      return [wrapPinnedBlocks({ children, className: 'tabs', data: { hName: 'code-tabs' }, type: 'code-tabs' }, data)];
    }

    case 'api-header': {
      const headerJson = data as ApiHeaderJson;
      const depth = headerJson.level || (compatibilityMode ? 1 : 2);
      return [
        wrapPinnedBlocks(
          {
            children: 'title' in headerJson ? textToInline(headerJson.title || '') : [],
            depth,
            type: 'heading',
          },
          data,
        ),
      ];
    }

    case 'image': {
      const imageJson = data as ImageBlockJson;
      const imgData = imageJson.images.find(i => i.image);
      if (!imgData?.image) return [];

      const [url, title, alt] = imgData.image;
      const block: MdastNode = {
        alt: alt || imgData.caption || '',
        data: {
          hProperties: {
            ...(imgData.align && { align: imgData.align }),
            ...(imgData.border && { border: imgData.border.toString() }),
            ...(imgData.sizing && { width: imgWidthBySize[imgData.sizing] }),
          },
        },
        title,
        type: 'image',
        url,
      };

      const img: MdastNode = imgData.caption
        ? {
            children: [
              block,
              { children: textToBlock(imgData.caption), data: { hName: 'figcaption' }, type: 'figcaption' },
            ],
            data: { hName: 'figure' },
            type: 'figure',
            url,
          }
        : block;
      return [wrapPinnedBlocks(img, data)];
    }

    case 'callout': {
      const calloutJson = data as CalloutJson;
      const types: Record<string, [string, string]> = {
        danger: ['❗️', 'error'],
        info: ['📘', 'info'],
        success: ['👍', 'okay'],
        warning: ['🚧', 'warn'],
      };

      const resolvedType =
        typeof calloutJson.type === 'string' && calloutJson.type in types
          ? types[calloutJson.type]
          : [calloutJson.icon || '👍', typeof calloutJson.type === 'string' ? calloutJson.type : 'default'];

      const [icon, theme] = Array.isArray(resolvedType) ? resolvedType : ['👍', 'default'];

      if (!(calloutJson.title || calloutJson.body)) return [];

      const titleBlocks = parseBlock(calloutJson.title || '');
      const bodyBlocks = parseBlock(calloutJson.body || '');

      const children: MdastNode[] = [];
      if (titleBlocks.length > 0 && titleBlocks[0].type === 'paragraph') {
        const firstTitle = titleBlocks[0] as { children?: MdastNode[] };
        const heading = {
          type: 'heading',
          depth: 3,
          children: (firstTitle.children || []) as unknown[],
        };
        children.push(heading as unknown as MdastNode);
        children.push(...titleBlocks.slice(1), ...bodyBlocks);
      } else {
        children.push(...titleBlocks, ...bodyBlocks);
      }

      const empty = !titleBlocks.length || !titleBlocks[0].children?.[0]?.value;

      const calloutElement: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'Callout',
        attributes: toAttributes({ icon, theme: theme || 'default', type: theme || 'default', empty }, [
          'icon',
          'theme',
          'type',
          'empty',
        ]),
        children: children as MdxJsxFlowElement['children'],
      };

      return [wrapPinnedBlocks(calloutElement as unknown as MdastNode, data)];
    }

    case 'parameters': {
      const paramsJson = data as ParametersJson;
      const { cols, data: tableData, rows } = paramsJson;

      if (!Object.keys(tableData).length) return [];

      const sparseData: string[][] = Object.entries(tableData).reduce(
        (mapped, [key, v]) => {
          const [row, col] = key.split('-');
          const rowIndex = row === 'h' ? 0 : parseInt(row, 10) + 1;
          const colIndex = parseInt(col, 10);

          if (!mapped[rowIndex]) mapped[rowIndex] = [];
          mapped[rowIndex][colIndex] = v;
          return mapped;
        },
        [] as string[][],
      );

      const tokenizeCell = compatibilityMode ? textToBlock : parseTableCell;
      const tableChildren = Array.from({ length: rows + 1 }, (_, y) => ({
        children: Array.from({ length: cols }, (__, x) => ({
          children: sparseData[y]?.[x] ? tokenizeCell(sparseData[y][x]) : [{ type: 'text', value: '' }],
          type: y === 0 ? 'tableHead' : 'tableCell',
        })),
        type: 'tableRow',
      }));

      return [
        wrapPinnedBlocks(
          { align: paramsJson.align ?? new Array(cols).fill('left'), children: tableChildren, type: 'table' },
          data,
        ),
      ];
    }

    case 'embed': {
      const embedJson = data as EmbedJson;
      const { html, title, url } = embedJson;
      try {
        embedJson.provider = new URL(url).hostname
          .split(/(?:www)?\./)
          .filter(i => i)
          .join('.');
      } catch {
        embedJson.provider = url;
      }

      return [
        wrapPinnedBlocks(
          {
            children: [
              { children: [{ type: 'text', value: title || '' }], title: embedJson.provider, type: 'link', url },
            ],
            data: { hName: 'embed-block', hProperties: { ...embedJson, href: url, html, title, url } },
            type: 'embed',
          },
          data,
        ),
      ];
    }

    case 'html': {
      const htmlJson = data as HtmlJson;
      return [
        wrapPinnedBlocks(
          {
            data: {
              hName: 'html-block',
              hProperties: { html: htmlJson.html, runScripts: compatibilityMode, safeMode },
            },
            type: 'html-block',
          },
          data,
        ),
      ];
    }

    case 'recipe':
    case 'tutorial-tile': {
      const recipeJson = data as RecipeJson;
      if (!recipeJson.slug || !recipeJson.title) return [];

      const recipeNode: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'Recipe',
        attributes: toAttributes(recipeJson, ['slug', 'title']),
        children: [],
        position: undefined,
      };

      return [recipeNode as unknown as MdastNode];
    }

    default: {
      const text = (data as { html?: string; text?: string }).text || (data as { html?: string }).html || '';
      return [
        wrapPinnedBlocks(
          { children: textToBlock(text), data: { hName: blockType || 'div', hProperties: data, ...data }, type: 'div' },
          data,
        ),
      ];
    }
  }
}

/**
 * Check if a child node is a flow element that needs unwrapping.
 */
const needsUnwrapping = (child: RootContent): boolean => {
  return child.type === 'mdxJsxFlowElement';
};

/**
 * Unified plugin that transforms magicBlock nodes into final MDAST nodes.
 */
const magicBlockTransformer: Plugin<[MagicBlockTransformerOptions?], MdastRoot> =
  (options = {}) =>
  tree => {
    const modifications: { children: RootContent[]; index: number; parent: Parent }[] = [];

    visit(tree, 'magicBlock', (node: MagicBlockNode, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return undefined;

      const children = transformMagicBlock(node.blockType, node.data as MagicBlockJson, options) as unknown as RootContent[];
      if (!children.length) {
        // Remove the node if transformation returns nothing
        parent.children.splice(index, 1);
        return [SKIP, index];
      }

      if (children[0] && needsUnwrapping(children[0]) && parent.type === 'paragraph') {
        // Find paragraph's parent and unwrap
        let paragraphParent: Parent | undefined;
        visit(tree, 'paragraph', (p, pIndex, pParent) => {
          if (p === parent && pParent && 'children' in pParent) {
            paragraphParent = pParent as Parent;
            return false;
          }
          return undefined;
        });

        if (paragraphParent) {
          const paragraphIndex = paragraphParent.children.indexOf(parent as RootContent);
          if (paragraphIndex !== -1) {
            modifications.push({ children, index: paragraphIndex, parent: paragraphParent });
          }
        }
        return SKIP;
      }

      parent.children.splice(index, 1, ...children);
      return [SKIP, index + children.length];
    });

    // Apply modifications in reverse order to avoid index shifting
    modifications.reverse().forEach(({ children, index, parent }) => {
      parent.children.splice(index, 1, ...children);
    });
  };

export default magicBlockTransformer;
