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
import type { HtmlExtension } from 'micromark-util-types';
import type { Plugin } from 'unified';

import { micromark } from 'micromark';
import { gfmStrikethrough, gfmStrikethroughHtml } from 'micromark-extension-gfm-strikethrough';
import { htmlBlockNames } from 'micromark-util-html-tag-name';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';

import { legacyVariableFromMarkdown } from '../../../../lib/mdast-util/legacy-variable';
import { legacyVariable } from '../../../../lib/micromark/legacy-variable';
import { STANDARD_HTML_TAGS } from '../../../../utils/common-html-words';
import { toAttributes } from '../../../utils';
import normalizeEmphasisAST from '../normalize-malformed-md-syntax';

import {
  CLOSE_BLOCK_TAG_BOUNDARY_RE,
  COMPLETE_HTML_ELEMENT_RE,
  HTML_ELEMENT_BLOCK_RE,
  HTML_TAG_RE,
  NEWLINE_WITH_WHITESPACE_RE,
} from './patterns';
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

/**
 * Converts leading newlines in magic block content to `<br>` tags.
 * Leading newlines are stripped by remark-parse before they become soft break nodes,
 * so remark-breaks cannot handle them. We convert them to HTML `<br>` tags instead.
 */
const ensureLeadingBreaks = (text: string): string => text.replace(/^\n+/, match => '<br>'.repeat(match.length));

/** Preprocesses magic block body content before parsing. */
const preprocessBody = (text: string): string => {
  return ensureLeadingBreaks(text);
};

/** Markdown parser */
const contentParser = unified()
  .data('micromarkExtensions', [legacyVariable()])
  .data('fromMarkdownExtensions', [legacyVariableFromMarkdown()])
  .use(remarkParse)
  .use(remarkBreaks)
  .use(remarkGfm)
  .use(normalizeEmphasisAST);

/**
 * Micromark HTML extension that compiles legacy `<<variable>>` tokens to
 * `<Variable>` / `<Glossary>` component tags, matching the output that
 * the previous mdast-util + remarkRehype pipeline produced.
 */
const legacyVariableHtml = (): HtmlExtension => {
  let value = '';

  return {
    enter: {
      legacyVariableValue() {
        this.buffer();
      },
    },
    exit: {
      legacyVariableValue() {
        value = this.resume();
      },
      legacyVariable() {
        if (value.startsWith('glossary:')) {
          const term = value.slice('glossary:'.length).trim();
          this.tag(`<Glossary term="${term}">`);
          this.raw(term);
          this.tag('</Glossary>');
        } else {
          this.tag(`<Variable name="${value.trim()}" isLegacy>`);
          this.tag('</Variable>');
        }
      },
    },
  };
};

/**
 * Lightweight inline markdown → HTML converter.
 *
 * Uses `micromark` directly instead of the full unified/remark/rehype pipeline
 * to keep call stack depth shallow. This avoids stack overflows in browsers
 * when called from the deeply nested `processMarkdownInHtmlString` context.
 *
 * Configured with only the extensions needed for inline text:
 * - Core CommonMark (emphasis, bold, code spans, links, images)
 * - GFM strikethrough (`~~text~~`)
 * - Legacy variables (`<<var>>`)
 */
const inlineMarkdownToHtml = (text: string): string =>
  micromark(text, {
    allowDangerousProtocol: true,
    extensions: [gfmStrikethrough(), legacyVariable()],
    htmlExtensions: [gfmStrikethroughHtml(), legacyVariableHtml()],
  });

/** HTML parser (HTML string → hast) */
const htmlParser = unified().use(rehypeParse, { fragment: true });

/** HTML stringifier (hast → HTML string) */
const htmlStringifier = unified().use(rehypeStringify);

/** Process \|, \<, \> backslash escapes. Only < is entity-escaped; > is left literal to avoid double-encoding by rehype. */
const processBackslashEscapes = (text: string): string =>
  text.replace(/\\<([^>]*)>/g, '&lt;$1>').replace(/\\([<>|])/g, (_, c) => (c === '<' ? '&lt;' : c === '>' ? '>' : c));

/** Block-level HTML tags that trigger CommonMark type 6 HTML blocks (condition 6). */
const BLOCK_LEVEL_TAGS: ReadonlySet<string> = new Set(htmlBlockNames);

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

    const htmlString = inlineMarkdownToHtml(escapeInvalidTags(text));
    const parsed = htmlParser.parse(htmlString) as HastRoot;
    const nodes = parsed.children.flatMap(n =>
      n.type === 'element' && (n as HastElement).tagName === 'p' ? (n as HastElement).children : [n],
    );

    const leading = text.match(/^\s+/)?.[0];
    const trailing = text.match(/\s+$/)?.[0];
    if (leading) nodes.unshift({ type: 'text', value: leading });
    if (trailing) nodes.push({ type: 'text', value: trailing });

    return nodes;
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
 * Separate a closing block-level tag from the content that follows it.
 *
 * Each \n in the original text becomes a <br> tag to preserve spacing, then a
 * blank line (\n\n) is appended so CommonMark ends the HTML block and parses
 * the following content as markdown.
 */
const separateBlockTagFromContent = (match: string, tag: string, inlineChar?: string, nextLineChar?: string) => {
  if (!BLOCK_LEVEL_TAGS.has(tag.toLowerCase())) return match;

  const newlineCount = (match.match(/\n/g) ?? []).length;
  const breaks = '<br>'.repeat(newlineCount);

  return `</${tag}>${breaks}\n\n${inlineChar || nextLineChar}`;
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
    .replace(CLOSE_BLOCK_TAG_BOUNDARY_RE, separateBlockTagFromContent);
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
  if (!text.trim()) return textToBlock('');
  const tree = contentParser.runSync(contentParser.parse(text)) as MdastRoot;
  return tree.children as MdastNode[];
};

const parseInline = (text: string): MdastNode[] => {
  if (!text.trim()) return textToInline(text);
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
            children: 'title' in headerJson ? parseInline(headerJson.title || '') : [],
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
        const bodyBlocks = parseBlock(preprocessBody(calloutJson.body || ''));
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
          children: sparseData[y]?.[x] ? tokenizeCell(preprocessBody(sparseData[y][x])) : [{ type: 'text', value: '' }],
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
      container: Parent;
      inlineNodes: RootContent[];
      parent: Parent;
    }[] = [];

    visitParents(tree, 'magicBlock', (node: MagicBlockNode, ancestors: Parent[]) => {
      const parent = ancestors[ancestors.length - 1]; // direct parent of the current node
      const index = parent.children.indexOf(node);
      if (index === -1) return;

      const children = transformMagicBlock(
        node.blockType,
        node.data as MagicBlockJson,
        node.value,
        options,
      ) as unknown as RootContent[];
      if (!children.length) {
        // `visitParents` doesn't support [Action, Index] returns like `visit` does;
        // a bare return after splicing is sufficient since `visitParents` walks by
        // tree structure rather than index.
        parent.children.splice(index, 1);
        return;
      }

      // If parent is a paragraph and we're inserting block nodes (which must not be in paragraphs), lift them out
      if (parent.type === 'paragraph' && children.some(child => isBlockNode(child))) {
        const blockNodes: RootContent[] = [];
        const inlineNodes: RootContent[] = [];

        children.forEach(child => {
          (isBlockNode(child) ? blockNodes : inlineNodes).push(child);
        });

        replacements.push({
          container: ancestors[ancestors.length - 2] || tree, // grandparent of the current node
          parent,
          blockNodes,
          inlineNodes,
          before: parent.children.slice(0, index) as RootContent[],
          after: parent.children.slice(index + 1) as RootContent[],
        });
      } else {
        parent.children.splice(index, 1, ...children);
      }
    });

    // Second pass: apply replacements that require lifting block nodes out of paragraphs
    // Process in reverse order to maintain correct indices
    for (let i = replacements.length - 1; i >= 0; i -= 1) {
      const { after, before, blockNodes, container, inlineNodes, parent } = replacements[i];
      const containerChildren = container.children as RootContent[];
      const paraIndex = containerChildren.indexOf(parent as RootContent);

      if (paraIndex === -1) {
        parent.children.splice(before.length, 1, ...blockNodes, ...inlineNodes);
        // eslint-disable-next-line no-continue
        continue;
      }

      if (inlineNodes.length > 0) {
        parent.children = [...before, ...inlineNodes, ...after];
        if (blockNodes.length > 0) {
          containerChildren.splice(paraIndex + 1, 0, ...blockNodes);
        }
      } else if (before.length === 0 && after.length === 0) {
        containerChildren.splice(paraIndex, 1, ...blockNodes);
      } else {
        parent.children = [...before, ...after];
        if (blockNodes.length > 0) {
          containerChildren.splice(paraIndex + 1, 0, ...blockNodes);
        }
      }
    }
  };

export default magicBlockTransformer;
