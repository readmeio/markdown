/**
 * Unified plugin that transforms `magicBlock` MDAST nodes into final nodes.
 *
 * This replaces the magicBlockRestorer plugin by working directly with
 * parsed `magicBlock` nodes from the micromark tokenizer instead of
 * finding placeholder tokens.
 */
import type {
  MdastNode,
  MagicBlockJson,
  CodeBlockJson,
  ApiHeaderJson,
  ImageBlockJson,
  CalloutJson,
  ParametersJson,
  EmbedJson,
  HtmlJson,
  RecipeJson,
  MagicBlockTransformerOptions,
} from './types';
import type { MagicBlockNode } from '../../../../lib/mdast-util/magic-block/types';
import type { Root as HastRoot, Text as HastText, Element as HastElement, ElementContent } from 'hast';
import type { Root as MdastRoot, RootContent, Parent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { htmlBlockNames } from 'micromark-util-html-tag-name';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

import { STANDARD_HTML_TAGS } from '../../../../utils/common-html-words';
import { toAttributes } from '../../../utils';
import normalizeEmphasisAST from '../normalize-malformed-md-syntax';

import {
  EMPTY_IMAGE_PLACEHOLDER,
  EMPTY_EMBED_PLACEHOLDER,
  EMPTY_CODE_PLACEHOLDER,
  EMPTY_CALLOUT_PLACEHOLDER,
  EMPTY_TABLE_PLACEHOLDER,
  EMPTY_RECIPE_PLACEHOLDER,
} from './placeholder';

/**
 * Wraps a node in a "pinned" container if sidebar: true is set.
 */
const wrapPinnedBlocks = (node: MdastNode, data: MagicBlockJson): MdastNode => {
  if (!data.sidebar) return node;
  return {
    children: [node],
    data: { hName: 'rdme-pin', hProperties: { className: 'pin' } },
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

/** Markdown parser */
const contentParser = unified().use(remarkParse).use(remarkGfm).use(normalizeEmphasisAST);

/** Markdown to HTML processor (mdast → hast → HTML string) */
const markdownToHtml = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify);

/** HTML parser (HTML string → hast) */
const htmlParser = unified().use(rehypeParse, { fragment: true });

/** HTML stringifier (hast → HTML string) */
const htmlStringifier = unified().use(rehypeStringify);

/** Process \|, \<, \> backslash escapes. Also escapes the matching > in \<...> pairs. */
const processBackslashEscapes = (text: string): string =>
  text
    .replace(/\\<([^>]*)>/g, '&lt;$1&gt;')
    .replace(/\\([<>|])/g, (_, c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c));

/** Matches HTML tags (open, close, self-closing) with optional attributes. */
const HTML_TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']*(?:"[^"]*"|'[^']*'))*[^>"']*)>/g;

/** Matches an HTML element from its opening tag to the matching closing tag. */
const HTML_ELEMENT_BLOCK_RE = /<([a-zA-Z][a-zA-Z0-9-]*)[\s>][\s\S]*?<\/\1>/g;

/** Matches a newline with surrounding horizontal whitespace. */
const NEWLINE_WITH_WHITESPACE_RE = /[^\S\n]*\n[^\S\n]*/g;

/** Block-level HTML tags that trigger CommonMark type 6 HTML blocks (condition 6). */
const BLOCK_LEVEL_TAGS: ReadonlySet<string> = new Set(htmlBlockNames);

/** Matches a closing block-level tag followed by non-tag text or by a newline then non-blank content. */
const CLOSE_BLOCK_TAG_BOUNDARY_RE = /<\/([a-zA-Z][a-zA-Z0-9-]*)>\s*(?:(?!<)(\S)|\n([^\n]))/g;

/** Tests whether a string contains a complete HTML element (open + close tag). */
const COMPLETE_HTML_ELEMENT_RE = /<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z]/;

const escapeInvalidTags = (str: string): string =>
  str.replace(HTML_TAG_RE, (match, tag, rest) => {
    const tagName = tag.replace(/^\//, '');
    if (STANDARD_HTML_TAGS.has(tagName.toLowerCase())) return match;
    // Preserve PascalCase tags (custom components like <Glossary>) for the main pipeline
    if (/^[A-Z]/.test(tagName)) return match;
    return `&lt;${tag}${rest}&gt;`;
  });

/**
 * Process markdown within HTML string.
 * 1. Parse HTML to HAST
 * 2. Find text nodes, parse as markdown, convert to HAST
 * 3. Stringify back to HTML
 *
 * PascalCase component tags (e.g. `<Glossary>`) are temporarily replaced with
 * placeholders before HTML parsing so `rehype-parse` doesn't mangle them
 * (it treats unknown tags as void elements, stripping their children).
 */
const processMarkdownInHtmlString = (html: string): string => {
  const placeholders: [string, string][] = [];
  let counter = 0;
  const safened = escapeInvalidTags(html).replace(HTML_TAG_RE, match => {
    if (!/^<\/?[A-Z]/.test(match)) return match;
    const id = `<!--PC${(counter += 1)}-->`;
    placeholders.push([id, match]);
    return id;
  });

  const hast = htmlParser.parse(safened) as HastRoot;

  const textToHast = (text: string): HastRoot['children'] => {
    if (!text.trim()) return [{ type: 'text', value: text }];

    const parsed = markdownToHtml.runSync(markdownToHtml.parse(escapeInvalidTags(text))) as HastRoot;
    return parsed.children.flatMap(n =>
      n.type === 'element' && (n as HastElement).tagName === 'p' ? (n as HastElement).children : [n],
    );
  };

  const processChildren = (children: HastRoot['children']): HastRoot['children'] =>
    children.flatMap(child => (child.type === 'text' ? textToHast((child as HastText).value) : [child]));

  hast.children = processChildren(hast.children);
  visit(hast, 'element', (node: HastElement) => {
    node.children = processChildren(node.children) as ElementContent[];
  });

  return placeholders.reduce((res, [id, original]) => res.replace(id, original), htmlStringifier.stringify(hast));
};

/**
 * CommonMark doesn't process markdown inside HTML blocks -
 * so `<ul><li>_text_</li></ul>` won't convert underscores to emphasis.
 * We parse first, then visit html nodes and process their text content.
 */
const parseTableCell = (text: string): MdastNode[] => {
  if (!text.trim()) return [{ type: 'text', value: '' }];

  // Convert \n (and surrounding whitespace) to <br> inside HTML blocks so
  // CommonMark doesn't split them on blank lines.
  // Then strip leading whitespace to prevent indented code blocks.
  const escaped = processBackslashEscapes(text);
  const normalized = escaped
    .replace(HTML_ELEMENT_BLOCK_RE, match => match.replace(NEWLINE_WITH_WHITESPACE_RE, '<br>'))
    // Insert a blank line after closing block-level tags so CommonMark doesn't
    // swallow subsequent text into the HTML block (type 6 blocks only end on blank lines).
    .replace(CLOSE_BLOCK_TAG_BOUNDARY_RE, (match, tag, inlineChar, nextLineChar) =>
      BLOCK_LEVEL_TAGS.has(tag.toLowerCase()) ? `</${tag}>\n\n${inlineChar || nextLineChar}` : match,
    );
  const trimmedLines = normalized.split('\n').map(line => line.trimStart());
  const processed = trimmedLines.join('\n');
  const tree = contentParser.runSync(contentParser.parse(processed)) as MdastRoot;

  // Process markdown inside complete HTML elements (e.g. _emphasis_ within <li>).
  // Bare tags like "<i>" are left for rehypeRaw since rehype-parse would mangle them.
  visit(tree, 'html', (node: { type: 'html'; value: string }) => {
    if (COMPLETE_HTML_ELEMENT_RE.test(node.value)) {
      node.value = processMarkdownInHtmlString(node.value);
    } else {
      node.value = escapeInvalidTags(node.value);
    }
  });

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
  rawValue: string,
  options: MagicBlockTransformerOptions = {},
): MdastNode[] {
  const { compatibilityMode = false, safeMode = false } = options;

  // Handle empty data by returning placeholder nodes for known block types
  // This allows the editor to show appropriate placeholder UI instead of nothing
  if (Object.keys(data).length < 1) {
    switch (blockType) {
      case 'image':
        return [EMPTY_IMAGE_PLACEHOLDER];
      case 'embed':
        return [EMPTY_EMBED_PLACEHOLDER];
      case 'code':
        return [EMPTY_CODE_PLACEHOLDER];
      case 'callout':
        return [EMPTY_CALLOUT_PLACEHOLDER];
      case 'parameters':
      case 'table':
        return [EMPTY_TABLE_PLACEHOLDER];
      case 'recipe':
      case 'tutorial-tile':
        return [EMPTY_RECIPE_PLACEHOLDER];
      default:
        return [{ type: 'paragraph', children: [{ type: 'text', value: rawValue }] }];
    }
  }

  switch (blockType) {
    case 'code': {
      const codeJson = data as CodeBlockJson;
      if (!codeJson.codes || !Array.isArray(codeJson.codes)) {
        return [wrapPinnedBlocks(EMPTY_CODE_PLACEHOLDER satisfies MdastNode, data)];
      }
      const children = codeJson.codes.map(obj => ({
        className: 'tab-panel',
        data: { hName: 'code', hProperties: { lang: obj.language, meta: obj.name || null } },
        lang: obj.language,
        meta: obj.name || null,
        type: 'code',
        value: obj.code.trim(),
      }));

      // Single code block without a tab name (meta or language) renders as a plain code block
      // Otherwise, we want to render it as a code tabs block
      if (children.length === 1) {
        if (!children[0].value) return [];
        if (!(children[0].meta || children[0].lang)) return [wrapPinnedBlocks(children[0], data)];
      }

      // Multiple code blocks or a single code block with a tab name (meta or language) renders as a code tabs block
      return [wrapPinnedBlocks({ children, className: 'tabs', data: { hName: 'CodeTabs' }, type: 'code-tabs' }, data)];
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
      if (!imageJson.images || !Array.isArray(imageJson.images)) {
        return [wrapPinnedBlocks(EMPTY_IMAGE_PLACEHOLDER satisfies MdastNode, data)];
      }
      const imgData = imageJson.images.find(i => i.image);
      if (!imgData?.image) {
        return [wrapPinnedBlocks(EMPTY_IMAGE_PLACEHOLDER satisfies MdastNode, data)];
      }

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
              { children: parseBlock(imgData.caption), data: { hName: 'figcaption' }, type: 'figcaption' },
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

      const hasTitle = !!calloutJson.title?.trim();
      const hasBody = !!calloutJson.body?.trim();
      const empty = !hasTitle;

      const children: MdastNode[] = [];

      if (hasTitle) {
        const titleBlocks = parseBlock(calloutJson.title || '');
        if (titleBlocks.length > 0 && titleBlocks[0].type === 'paragraph') {
          const firstTitle = titleBlocks[0] as { children?: MdastNode[] };
          const heading = {
            type: 'heading',
            depth: 3,
            children: (firstTitle.children || []) as unknown[],
          };
          children.push(heading as unknown as MdastNode);
          children.push(...titleBlocks.slice(1));
        } else {
          children.push(...titleBlocks);
        }
      } else {
        // Add empty heading placeholder so body goes to children.slice(1)
        // The Callout component expects children[0] to be the heading
        children.push({
          type: 'heading',
          depth: 3,
          children: [{ type: 'text', value: '' }],
        } as unknown as MdastNode);
      }

      if (hasBody) {
        const bodyBlocks = parseBlock(calloutJson.body || '');
        children.push(...bodyBlocks);
      }

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

      if (!tableData || !Object.keys(tableData).length) return [];
      if (typeof cols !== 'number' || typeof rows !== 'number' || cols < 1 || rows < 0) return [];

      const sparseData: string[][] = Object.entries(tableData).reduce((mapped, [key, v]) => {
        const [row, col] = key.split('-');
        const rowIndex = row === 'h' ? 0 : parseInt(row, 10) + 1;
        const colIndex = parseInt(col, 10);

        if (!mapped[rowIndex]) mapped[rowIndex] = [];
        mapped[rowIndex][colIndex] = v;
        return mapped;
      }, [] as string[][]);

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
      if (!embedJson.url) {
        return [wrapPinnedBlocks(EMPTY_EMBED_PLACEHOLDER satisfies MdastNode, data)];
      }
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
      if (typeof htmlJson.html !== 'string') return [];
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
const blockTypes = [
  'heading',
  'code',
  'code-tabs',
  'paragraph',
  'blockquote',
  'list',
  'table',
  'thematicBreak',
  'html',
  'yaml',
  'toml',
  'rdme-pin',
  'rdme-callout',
  'html-block',
  'embed',
  'figure',
  'mdxJsxFlowElement',
];

/**
 * Check if a node is a block-level node (cannot be inside a paragraph)
 */
const isBlockNode = (node: RootContent): boolean => blockTypes.includes(node.type);

/**
 * Unified plugin that transforms magicBlock nodes into final MDAST nodes.
 */
const magicBlockTransformer: Plugin<[MagicBlockTransformerOptions?], MdastRoot> =
  (options = {}) =>
  tree => {
    const replacements: {
      after: RootContent[];
      before: RootContent[];
      blockNodes: RootContent[];
      inlineNodes: RootContent[];
      parent: Parent;
    }[] = [];

    visit(tree, 'magicBlock', (node: MagicBlockNode, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return undefined;

      const children = transformMagicBlock(
        node.blockType,
        node.data as MagicBlockJson,
        node.value,
        options,
      ) as unknown as RootContent[];
      if (!children.length) {
        // Remove the node if transformation returns nothing
        parent.children.splice(index, 1);
        return [SKIP, index];
      }

      // If parent is a paragraph and we're inserting block nodes (which must not be in paragraphs), lift them out
      if (parent.type === 'paragraph' && children.some(child => isBlockNode(child))) {
        const blockNodes: RootContent[] = [];
        const inlineNodes: RootContent[] = [];

        // Separate block and inline nodes
        children.forEach(child => {
          if (isBlockNode(child)) {
            blockNodes.push(child);
          } else {
            inlineNodes.push(child);
          }
        });

        const before = parent.children.slice(0, index);
        const after = parent.children.slice(index + 1);

        replacements.push({
          parent,
          blockNodes,
          inlineNodes,
          before,
          after,
        });
      } else {
        // Normal case: just replace the inlineCode with the children
        parent.children.splice(index, 1, ...children);
      }
      return undefined;
    });

    // Second pass: apply replacements that require lifting block nodes out of paragraphs
    // Process in reverse order to maintain correct indices
    for (let i = replacements.length - 1; i >= 0; i -= 1) {
      const { after, before, blockNodes, inlineNodes, parent } = replacements[i];

      // Find the paragraph's position in the root
      const rootChildren = tree.children;
      const paraIndex = rootChildren.findIndex(child => child === parent);
      if (paraIndex === -1) {
        // Paragraph not found in root - fall back to normal replacement
        // This shouldn't happen normally, but handle it gracefully
        // Reconstruct the original index from before.length
        const originalIndex = before.length;
        parent.children.splice(originalIndex, 1, ...blockNodes, ...inlineNodes);
        // eslint-disable-next-line no-continue
        continue;
      }

      // Update or remove the paragraph
      if (inlineNodes.length > 0) {
        // Keep paragraph with inline nodes
        parent.children = [...before, ...inlineNodes, ...after];
        // Insert block nodes after the paragraph
        if (blockNodes.length > 0) {
          rootChildren.splice(paraIndex + 1, 0, ...blockNodes);
        }
      } else if (before.length === 0 && after.length === 0) {
        // Remove empty paragraph and replace with block nodes
        rootChildren.splice(paraIndex, 1, ...blockNodes);
      } else {
        // Keep paragraph with remaining content
        parent.children = [...before, ...after];
        // Insert block nodes after the paragraph
        if (blockNodes.length > 0) {
          rootChildren.splice(paraIndex + 1, 0, ...blockNodes);
        }
      }
    }
  };

export default magicBlockTransformer;
