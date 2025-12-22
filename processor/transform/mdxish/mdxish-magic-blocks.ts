/**
 * Legacy magic block parser for RDMD compatibility.
 * Parses `[block:TYPE]JSON[/block]` syntax and returns MDAST nodes.
 * Taken from the v6 branch with some modifications to be more type safe
 * and adapted with the mdxish flow.
 */
import type { BlockHit } from '../../../lib/utils/extractMagicBlocks';
import type { Code, Parent, Root as MdastRoot, RootContent } from 'mdast';
import type { Plugin } from 'unified';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Matches legacy magic block syntax: [block:TYPE]...JSON...[/block]
 * Group 1: block type (e.g., "image", "code", "callout")
 * Group 2: JSON content between the tags
 * Taken from the v6 branch
 */
const RGXP = /^\s*\[block:([^\]]*)\]([^]+?)\[\/block\]/;

interface MdastNode {
  [key: string]: unknown;
  children?: MdastNode[];
  type: string;
}

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

export interface ParseMagicBlockOptions {
  alwaysThrow?: boolean;
  compatibilityMode?: boolean;
  safeMode?: boolean;
}

/** Parses markdown in table cells */
const cellParser = unified().use(remarkParse).use(remarkGfm);

/**
 * Wraps a node in a "pinned" container if sidebar: true is set in the JSON.
 * Pinned blocks are displayed in a sidebar/floating position in the UI.
 */
const wrapPinnedBlocks = (node: MdastNode, json: MagicBlockJson): MdastNode => {
  if (!json.sidebar) return node;
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
 * Proxy that resolves image sizing values:
 * - "full" → "100%", "original" → "auto" (from imgSizeValues)
 * - Pure numbers like "50" → "50%" (percentage)
 * - Anything else passes through as-is (e.g., "200px")
 */
const imgWidthBySize = new Proxy(imgSizeValues, {
  get: (widths, size: string) => (size?.match(/^\d+$/) ? `${size}%` : size in widths ? widths[size] : size),
});

// Simple text to inline nodes (just returns text node - no markdown parsing)
const textToInline = (text: string): MdastNode[] => [{ type: 'text', value: text }];

// Simple text to block nodes (wraps in paragraph)
const textToBlock = (text: string): MdastNode[] => [{ children: textToInline(text), type: 'paragraph' }];

// Table cells may contain html or markdown content, so we need to parse it accordingly instead of keeping it as raw text
const parseInline = (text: string): MdastNode[] => {
  if (!text.trim()) return [{ type: 'text', value: '' }];
  const tree = cellParser.runSync(cellParser.parse(text)) as MdastRoot;
  return tree.children.flatMap(n =>
    // This unwraps the extra p node that might appear & wrapping the content
    n.type === 'paragraph' && 'children' in n ? (n.children as MdastNode[]) : [n as MdastNode],
  );
};

/**
 * Parse a magic block string and return MDAST nodes.
 *
 * @param raw - The raw magic block string including [block:TYPE] and [/block] tags
 * @param options - Parsing options for compatibility and error handling
 * @returns Array of MDAST nodes representing the parsed block
 */
function parseMagicBlock(raw: string, options: ParseMagicBlockOptions = {}): MdastNode[] {
  const { alwaysThrow = false, compatibilityMode = false, safeMode = false } = options;

  const matchResult = RGXP.exec(raw);
  if (!matchResult) return [];

  const [, rawType, jsonStr] = matchResult;
  const type = rawType?.trim();
  if (!type) return [];

  let json: MagicBlockJson;
  try {
    json = JSON.parse(jsonStr);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Invalid Magic Block JSON:', err);
    if (alwaysThrow) throw new Error('Invalid Magic Block JSON');
    return [];
  }

  if (Object.keys(json).length < 1) return [];

  // Each case handles a different magic block type and returns appropriate MDAST nodes
  switch (type) {
    // Code blocks: single code block or tabbed code blocks (multiple languages)
    case 'code': {
      const codeJson = json as CodeBlockJson;
      const children = codeJson.codes.map(obj => ({
        className: 'tab-panel',
        data: { hName: 'code', hProperties: { lang: obj.language, meta: obj.name || null } },
        lang: obj.language,
        meta: obj.name || null, // Tab name shown in the UI
        type: 'code',
        value: obj.code.trim(),
      }));

      // Single code block without a tab name renders as a plain code block
      if (children.length === 1) {
        if (!children[0].value) return [];
        if (children[0].meta) return [wrapPinnedBlocks(children[0], json)];
      }

      // Multiple code blocks render as tabbed code blocks
      return [wrapPinnedBlocks({ children, className: 'tabs', data: { hName: 'code-tabs' }, type: 'code-tabs' }, json)];
    }

    // API header: renders as a heading element (h1-h6)
    case 'api-header': {
      const headerJson = json as ApiHeaderJson;
      // In compatibility mode, default to h1; otherwise h2
      const depth = headerJson.level || (compatibilityMode ? 1 : 2);
      return [
        wrapPinnedBlocks(
          {
            children: 'title' in headerJson ? textToInline(headerJson.title || '') : [],
            depth,
            type: 'heading',
          },
          json,
        ),
      ];
    }

    // Image block: renders as <img> or <figure> with caption
    case 'image': {
      const imageJson = json as ImageBlockJson;
      const imgData = imageJson.images.find(i => i.image);
      if (!imgData?.image) return [];

      // Image array format: [url, title?, alt?]
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

      // Wrap in <figure> if caption is present
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
      return [wrapPinnedBlocks(img, json)];
    }

    // Callout: info/warning/error boxes with icon and theme
    case 'callout': {
      const calloutJson = json as CalloutJson;
      // Preset callout types map to [icon, theme] tuples
      const types: Record<string, [string, string]> = {
        danger: ['❗️', 'error'],
        info: ['📘', 'info'],
        success: ['👍', 'okay'],
        warning: ['🚧', 'warn'],
      };

      // Resolve type to [icon, theme] - use preset if available, otherwise custom
      const resolvedType =
        typeof calloutJson.type === 'string' && calloutJson.type in types
          ? types[calloutJson.type]
          : [calloutJson.icon || '👍', typeof calloutJson.type === 'string' ? calloutJson.type : 'default'];

      const [icon, theme] = Array.isArray(resolvedType) ? resolvedType : ['👍', 'default'];

      if (!(calloutJson.title || calloutJson.body)) return [];

      return [
        wrapPinnedBlocks(
          {
            children: [...textToBlock(calloutJson.title || ''), ...textToBlock(calloutJson.body || '')],
            data: {
              hName: 'rdme-callout',
              hProperties: { icon, theme: theme || 'default', title: calloutJson.title, value: calloutJson.body },
            },
            type: 'rdme-callout',
          },
          json,
        ),
      ];
    }

    // Parameters: renders as a table (used for API parameters, etc.)
    case 'parameters': {
      const paramsJson = json as ParametersJson;
      const { cols, data, rows } = paramsJson;

      if (!Object.keys(data).length) return [];

      /**
       * Convert sparse key-value data to 2D array.
       * Keys are formatted as "ROW-COL" where ROW is "h" for header or a number.
       * Example: { "h-0": "Name", "h-1": "Type", "0-0": "id", "0-1": "string" }
       * Becomes: [["Name", "Type"], ["id", "string"]]
       */
      const sparseData: string[][] = Object.entries(data).reduce((mapped, [key, v]) => {
        const [row, col] = key.split('-');
        // Header row ("h") becomes index 0, data rows are offset by 1
        const rowIndex = row === 'h' ? 0 : parseInt(row, 10) + 1;
        const colIndex = parseInt(col, 10);

        if (!mapped[rowIndex]) mapped[rowIndex] = [];
        mapped[rowIndex][colIndex] = v;
        return mapped;
      }, [] as string[][]);

      // In compatibility mode, wrap cell content in paragraphs; otherwise inline text
      const tokenizeCell = compatibilityMode ? textToBlock : parseInline;
      const children = Array.from({ length: rows + 1 }, (_, y) => ({
        children: Array.from({ length: cols }, (__, x) => ({
          children: sparseData[y]?.[x] ? tokenizeCell(sparseData[y][x]) : [{ type: 'text', value: '' }],
          type: y === 0 ? 'tableHead' : 'tableCell',
        })),
        type: 'tableRow',
      }));

      return [
        wrapPinnedBlocks({ align: paramsJson.align ?? new Array(cols).fill('left'), children, type: 'table' }, json),
      ];
    }

    // Embed: external content (YouTube, etc.) with provider detection
    case 'embed': {
      const embedJson = json as EmbedJson;
      const { html, title, url } = embedJson;
      // Extract provider name from URL hostname (e.g., "youtube.com" → "youtube.com")
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
              { children: [{ type: 'text', value: title || null }], title: embedJson.provider, type: 'link', url },
            ],
            data: { hName: 'rdme-embed', hProperties: { ...embedJson, href: url, html, title, url } },
            type: 'embed',
          },
          json,
        ),
      ];
    }

    // HTML block: raw HTML content (scripts enabled only in compatibility mode)
    case 'html': {
      const htmlJson = json as HtmlJson;
      return [
        wrapPinnedBlocks(
          {
            data: {
              hName: 'html-block',
              hProperties: { html: htmlJson.html, runScripts: compatibilityMode, safeMode },
            },
            type: 'html-block',
          },
          json,
        ),
      ];
    }

    // Unknown block types: render as generic div with JSON properties
    default: {
      const text = (json as { html?: string; text?: string }).text || (json as { html?: string }).html || '';
      return [
        wrapPinnedBlocks(
          { children: textToBlock(text), data: { hName: type || 'div', hProperties: json, ...json }, type: 'div' },
          json,
        ),
      ];
    }
  }
}

/**
 * Unified plugin that restores magic blocks from placeholder tokens.
 *
 * During preprocessing, extractMagicBlocks replaces [block:TYPE]...[/block]
 * with inline code tokens like `__MAGIC_BLOCK_0__`. This plugin finds those
 * tokens in the parsed MDAST and replaces them with the parsed block content.
 */
const magicBlockRestorer: Plugin<[{ blocks: BlockHit[] }], MdastRoot> =
  ({ blocks }) =>
  tree => {
    if (!blocks.length) return;

    // Map: key → original raw magic block content
    const magicBlockKeys = new Map(blocks.map(({ key, raw }) => [key, raw] as const));

    // Find inlineCode nodes that match our placeholder tokens
    visit(tree, 'inlineCode', (node: Code, index: number, parent: Parent) => {
      if (!parent || index == null) return;
      const raw = magicBlockKeys.get(node.value);
      if (!raw) return;

      // Parse the original magic block and replace the placeholder with the result
      const children = parseMagicBlock(raw) as unknown as RootContent[];
      if (!children.length) return;

      parent.children.splice(index, 1, ...children);
    });
  };

export default magicBlockRestorer;
