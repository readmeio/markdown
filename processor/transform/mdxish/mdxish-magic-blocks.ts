/**
 * Legacy magic block parser for RDMD compatibility.
 * Parses `[block:TYPE]JSON[/block]` syntax and returns MDAST nodes.
 * Taken from the v6 branch with some modifications to be more type safe
 * and adapted with the mdxish flow.
 */
import type { BlockHit } from '../../../lib/utils/extractMagicBlocks';
import type { Code, Parent, Root as MdastRoot, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { toAttributes } from '../../utils';

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

interface RecipeJson extends MagicBlockJson {
  backgroundColor?: string;
  emoji?: string;
  id?: string;
  link?: string;
  slug: string;
  title: string;
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
  
  // If there are multiple block-level nodes, keep them as-is to preserve the document structure and spacing
  if (tree.children.length > 1) {
    return tree.children as MdastNode[];
  }
  
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
            className: imgData.border ? 'border' : '',
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

      const titleBlocks = textToBlock(calloutJson.title || '');
      const bodyBlocks = textToBlock(calloutJson.body || '');

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

      // If there is no title or title is empty
      const empty = !titleBlocks.length || !titleBlocks[0].children[0]?.value;

      // Create mdxJsxFlowElement directly for mdxish
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

      return [wrapPinnedBlocks(calloutElement as unknown as MdastNode, json)];
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
              { children: [{ type: 'text', value: title || '' }], title: embedJson.provider, type: 'link', url },
            ],
            data: { hName: 'embed-block', hProperties: { ...embedJson, href: url, html, title, url } },
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

    // Recipe/TutorialTile: renders as Recipe component
    case 'recipe':
    case 'tutorial-tile': {
      const recipeJson = json as RecipeJson;
      if (!recipeJson.slug || !recipeJson.title) return [];

      // Create mdxJsxFlowElement directly for mdxish flow
      // Note: Don't wrap in pinned blocks for mdxish - rehypeMdxishComponents handles component resolution
      // The node structure matches what mdxishComponentBlocks creates for JSX tags
      const recipeNode: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'Recipe',
        attributes: toAttributes(recipeJson, ['slug', 'title']),
        children: [],
        // Position is optional but helps with debugging
        position: undefined,
      };

      return [recipeNode as unknown as MdastNode];
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
 * Block-level node types that cannot be nested inside paragraphs.
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
  'mdxJsxFlowElement',
];

/**
 * Check if a node is a block-level node (cannot be inside a paragraph)
 */
const isBlockNode = (node: RootContent): boolean => blockTypes.includes(node.type);

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

    // Collect replacements to apply (we need to visit in reverse to maintain indices)
    const replacements: {
      after: RootContent[];
      before: RootContent[];
      blockNodes: RootContent[];
      index: number;
      inlineNodes: RootContent[];
      parent: Parent;
    }[] = [];

    // First pass: collect all replacements
    visit(tree, 'inlineCode', (node: Code, index: number, parent: Parent) => {
      if (!parent || index == null) return undefined;
      const raw = magicBlockKeys.get(node.value);
      if (!raw) return undefined;

      const children = parseMagicBlock(raw) as unknown as RootContent[];
      if (!children.length) return undefined;

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
          index,
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
      const rootChildren = (tree as unknown as { children: RootContent[] }).children;
      const paraIndex = rootChildren.indexOf(parent as never);
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

export default magicBlockRestorer;
