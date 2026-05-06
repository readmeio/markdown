import type { MagicBlockEmbed, MagicBlockImage } from './magic-blocks/types';
import type { FigureNode, MdxishTable, MdxishTableCell, MdxishTableRow } from './types';
import type { Anchor, Callout, EmbedBlock, ImageAlign, ImageBlock, Recipe } from '../../../types';
import type { Html, Node, Paragraph, Parent, PhrasingContent, RootContent, Table } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { SKIP, visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { mdast } from '../../../lib';
import { getAttrs, isMDXElement } from '../../utils';

import { unwrapSoleParagraph } from './tables/utils';

function toImageAlign(value: string | undefined): ImageAlign | undefined {
  if (value === 'left' || value === 'center' || value === 'right') {
    return value;
  }
  return undefined;
}

function toBool(value: boolean | string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  return value !== '' && value !== 'false';
}

function extractText(nodes: RootContent[]): string {
  return nodes
    .map(n => {
      if ('value' in n && typeof n.value === 'string') return n.value;
      if ('children' in n) return extractText(n.children as RootContent[]);
      return '';
    })
    .join('');
}

const FIGURE_OPEN_REGEX = /^<figure(\s[^>]*)?>$/;
const FIGURE_CLOSE_REGEX = /^\s*<\/figure>\s*$/;
const FIGURE_COMPLETE_REGEX = /^<figure(\s[^>]*)?>[\s\S]*<\/figure>\s*$/;
const FIGCAPTION_REGEX = /<figcaption>(.*?)<\/figcaption>/s;
const FIGCAPTION_OPEN_REGEX = /^<figcaption>$/;
const FIGCAPTION_CLOSE_REGEX = /^<\/figcaption>$/;

/**
 * Extracts an image or image-block from a node. If the node itself is an image/image-block,
 * it is returned directly. If the node is a paragraph, its children are searched for one.
 * This is needed because standalone markdown images (`![](url)`) may be wrapped in a
 * paragraph node by the parser, or already transformed to image-block by imageTransformer.
 */
function findImageInNode(node: RootContent): RootContent | undefined {
  if (node.type === 'image' || (node.type as string) === NodeTypes.imageBlock) return node;
  if (node.type === 'paragraph') {
    return (node as Paragraph).children.find(
      child => child.type === 'image' || (child.type as string) === NodeTypes.imageBlock,
    ) as RootContent | undefined;
  }
  return undefined;
}

/**
 * Parses a complete `<figure>` HTML string into image URL, alt text, and optional caption.
 * Returns undefined if the HTML doesn't contain a recognizable image.
 */
function parseCompleteFigure(html: string): { alt: string; caption?: string; url: string } | undefined {
  const imageMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(html);
  if (!imageMatch) return undefined;

  const captionMatch = FIGCAPTION_REGEX.exec(html);
  return {
    alt: imageMatch[1],
    caption: captionMatch?.[1],
    url: imageMatch[2],
  };
}

/**
 * Builds a FigureNode containing an image and optional figcaption from parsed figure data.
 */
function buildFigureNode(
  imageNode: RootContent,
  captionText: string | undefined,
  position: Html['position'],
): FigureNode {
  const figureChildren: FigureNode['children'] = [imageNode as RootContent];
  if (captionText) {
    figureChildren.push({
      children: [{ type: 'text', value: captionText }],
      data: { hName: 'figcaption' },
      type: 'figcaption',
    } as RootContent);
  }

  return {
    children: figureChildren,
    data: { hName: 'figure' },
    position,
    type: 'figure',
  };
}

/**
 * Scans siblings starting at `startIndex` within a parent's children looking for the
 * figcaption text and </figure> closing tag. Handles three fragmentation patterns:
 *
 * 1. Combined: `<figcaption>Hello</figcaption>\n</figure>` in one html node
 * 2. Separate: `<figcaption>Hello</figcaption>` then `</figure>` as sibling html nodes
 * 3. Split (table cells): `<figcaption>` + text(Hello) + `</figcaption>` + `</figure>` as siblings
 */
function scanForFigcaptionAndClose(
  children: RootContent[],
  startIndex: number,
): { captionText?: string; endIndex: number; foundClose: boolean } {
  let captionText: string | undefined;
  let endIndex = startIndex - 1;
  let foundClose = false;

  for (let j = startIndex; j < children.length; j += 1) {
    const sibling = children[j];
    const htmlValue = sibling.type === 'html' ? (sibling as Html).value : undefined;

    if (htmlValue === undefined && sibling.type !== 'text') break;

    // Standalone </figure>
    if (htmlValue && FIGURE_CLOSE_REGEX.test(htmlValue)) {
      endIndex = j;
      foundClose = true;
      break;
    }

    // Combined <figcaption>...</figcaption> in one node (possibly with </figure>)
    if (htmlValue) {
      const figcaptionMatch = FIGCAPTION_REGEX.exec(htmlValue);
      if (figcaptionMatch) {
        captionText = figcaptionMatch[1];
        if (FIGURE_CLOSE_REGEX.test(htmlValue.replace(FIGCAPTION_REGEX, ''))) {
          endIndex = j;
          foundClose = true;
          break;
        }
        const nextSibling = children[j + 1];
        if (nextSibling?.type === 'html' && FIGURE_CLOSE_REGEX.test((nextSibling as Html).value)) {
          endIndex = j + 1;
          foundClose = true;
          break;
        }
      }
    }

    // Split figcaption: <figcaption> + text + </figcaption> as separate nodes (table cells)
    if (htmlValue && FIGCAPTION_OPEN_REGEX.test(htmlValue)) {
      const textNode = children[j + 1];
      const closeCaption = children[j + 2];
      if (
        textNode?.type === 'text' &&
        closeCaption?.type === 'html' &&
        FIGCAPTION_CLOSE_REGEX.test((closeCaption as Html).value)
      ) {
        captionText = (textNode as { value: string }).value;
        const closeFigure = children[j + 3];
        if (closeFigure?.type === 'html' && FIGURE_CLOSE_REGEX.test((closeFigure as Html).value)) {
          endIndex = j + 3;
          foundClose = true;
          break;
        }
      }
    }
  }

  return { captionText, endIndex, foundClose };
}

/**
 * Reconstruct fragmented or complete HTML <figure> elements into figure MDAST nodes.
 *
 * Handles three html-based cases (the JSX case is handled by transformFigure in COMPONENT_MAP):
 * 1. Complete: A single html node containing the full `<figure>...<figcaption>...</figure>` block
 *    (e.g. inside callouts where blockquote parsing keeps it together).
 * 2. Fragmented siblings: `terminateHtmlFlowBlocks` splits `<figure>` into separate sibling
 *    nodes (open tag, image, figcaption, close tag).
 * 3. Split tags (GFM table cells): Each tag becomes its own html node with text nodes between them.
 *
 * Runs on all parent nodes so it works inside callouts, tables, and at root level.
 */
function reassembleHtmlFigures(tree: Parent) {
  // Case 1: Handle complete <figure> blocks in a single html node (e.g. inside callouts)
  visit(tree, 'html', (node: Html, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;
    if (!FIGURE_COMPLETE_REGEX.test(node.value.trim())) return;

    const parsed = parseCompleteFigure(node.value);
    if (!parsed) return;

    const imageNode = {
      type: 'image',
      url: parsed.url,
      alt: parsed.alt,
    } as RootContent;

    const figureNode = buildFigureNode(imageNode, parsed.caption, node.position);
    (parent.children as Node[]).splice(index, 1, figureNode);
  });

  // Case 2 & 3: Handle fragmented <figure> blocks split across sibling nodes
  const processChildren = (parent: Parent) => {
    const children = parent.children as RootContent[];
    let i = 0;

    while (i < children.length) {
      const node = children[i];
      const nextNode = children[i + 1];
      const imageNode = nextNode ? findImageInNode(nextNode) : undefined;

      if (
        node.type === 'html' &&
        FIGURE_OPEN_REGEX.test((node as Html).value.trim()) &&
        imageNode
      ) {
        const { captionText, endIndex, foundClose } = scanForFigcaptionAndClose(children, i + 2);

        if (foundClose) {
          const figureNode = buildFigureNode(imageNode, captionText, node.position);
          (parent.children as Node[]).splice(i, endIndex - i + 1, figureNode);
        }
      }
      i += 1;
    }
  };

  // Process all parent nodes (root, callouts, blockquotes, table cells, list items)
  visit(tree, (node: Node) => {
    if ('children' in node) processChildren(node as Parent);
  });
}

interface ImageAttrs {
  align?: string;
  alt?: string;
  border?: boolean | string;
  caption?: string;
  className?: string;
  height?: number | string;
  lazy?: boolean;
  src?: string;
  title?: string;
  width?: number | string;
}

interface CalloutAttrs {
  empty?: boolean;
  icon?: string;
  theme?: string;
}

interface EmbedAttrs {
  favicon?: string;
  height?: string;
  href?: string;
  html?: string;
  iframe?: boolean;
  image?: string;
  provider?: string;
  providerName?: string;
  providerUrl?: string;
  title?: string;
  typeOfEmbed?: string;
  url?: string;
  width?: string;
}

interface RecipeAttrs {
  backgroundColor?: string;
  emoji?: string;
  id?: string;
  link?: string;
  slug?: string;
  title?: string;
}

/**
 * Transforms an inline `<Anchor>` JSX element into a readme-anchor MDAST node.
 */
const transformAnchor = (jsx: MdxJsxTextElement): Anchor => {
  const attrs = getAttrs<Anchor['data']['hProperties']>(jsx);
  const { href = '', label, target, title } = attrs;

  return {
    type: NodeTypes.anchor,
    children: jsx.children as PhrasingContent[],
    data: {
      hName: 'Anchor',
      hProperties: {
        href,
        ...(label && { label }),
        ...(target && { target }),
        ...(title && { title }),
      },
    },
    position: jsx.position,
  };
};

/**
 * Transforms an `<Image />` JSX element into an image-block MDAST node.
 * Normalizes attributes (align, border, width→sizing) and parses caption markdown into children.
 */
const transformImage = (jsx: MdxJsxFlowElement): ImageBlock => {
  const attrs = getAttrs<ImageAttrs>(jsx);
  const { align, alt = '', border, caption, className, height, lazy, src = '', title = '', width } = attrs;

  const validAlign = toImageAlign(align);
  const sizing = width !== undefined ? String(width) : undefined;

  const hProperties: ImageBlock['data']['hProperties'] = {
    alt,
    src,
    title,
    ...(validAlign && { align: validAlign }),
    ...(border !== undefined && { border: toBool(border) }),
    ...(caption && { caption }),
    ...(className && { className }),
    ...(height !== undefined && { height: String(height) }),
    ...(lazy !== undefined && { lazy: toBool(lazy) }),
    ...(sizing && { sizing }),
    ...(sizing && { width: sizing }),
  };

  return {
    type: NodeTypes.imageBlock,
    align: validAlign,
    alt,
    border: toBool(border),
    caption,
    children: caption ? mdast(caption).children : [],
    className,
    height: height !== undefined ? String(height) : undefined,
    lazy: toBool(lazy),
    sizing,
    src,
    title,
    width: sizing,
    data: {
      hName: 'img',
      hProperties,
    },
    position: jsx.position,
  };
};

/**
 * Transforms a `<Callout>` JSX element into an rdme-callout MDAST node.
 */
const transformCallout = (jsx: MdxJsxFlowElement): Callout => {
  const attrs = getAttrs<CalloutAttrs>(jsx);
  const { empty = false, icon = '', theme = '' } = attrs;

  return {
    type: NodeTypes.callout,
    children: jsx.children as Callout['children'],
    data: {
      hName: 'Callout',
      hProperties: {
        empty,
        icon,
        theme,
      },
    },
    position: jsx.position,
  };
};

/**
 * Transforms an `<Embed />` JSX element into an embed-block MDAST node.
 */
const transformEmbed = (jsx: MdxJsxFlowElement): EmbedBlock => {
  const attrs = getAttrs<EmbedAttrs>(jsx);
  const {
    favicon,
    height,
    href,
    html,
    iframe,
    image,
    providerName,
    providerUrl,
    provider,
    title = '',
    typeOfEmbed,
    url = '',
    width,
  } = attrs;

  return {
    type: NodeTypes.embedBlock,
    title,
    url,
    data: {
      hName: 'embed',
      hProperties: {
        title,
        url,
        ...(favicon && { favicon }),
        ...(height && { height }),
        ...(href && { href }),
        ...(html && { html }),
        ...(iframe !== undefined && { iframe }),
        ...(image && { image }),
        ...(providerName && { providerName }),
        ...(providerUrl && { providerUrl }),
        ...(provider && { provider }),
        ...(typeOfEmbed && { typeOfEmbed }),
        ...(width && { width }),
      },
    },
    position: jsx.position,
  };
};

/**
 * Transforms a `<Recipe />` JSX element into a recipe MDAST node.
 */
const transformRecipe = (jsx: MdxJsxFlowElement): Recipe => {
  const attrs = getAttrs<RecipeAttrs>(jsx);
  const { backgroundColor = '', emoji = '', id = '', link = '', slug = '', title = '' } = attrs;

  return {
    type: NodeTypes.recipe,
    backgroundColor,
    emoji,
    id,
    link,
    slug,
    title,
    position: jsx.position,
  };
};

/**
 * Transform a magic block image node into an ImageBlock.
 * Magic block images have structure: { type: 'image', url, title, alt, data.hProperties }
 */
const transformMagicBlockImage = (node: MagicBlockImage): ImageBlock => {
  const { alt = '', data, position, title = '', url = '' } = node;
  const hProps = data?.hProperties || {};
  const { align, border, width } = hProps;

  const validAlign = toImageAlign(align);
  const sizing = width || undefined;

  const hProperties: ImageBlock['data']['hProperties'] = {
    alt,
    src: url,
    title,
    ...(validAlign && { align: validAlign }),
    ...(border !== undefined && { border: toBool(border) }),
    ...(sizing && { sizing }),
    ...(sizing && { width: sizing }),
  };

  return {
    type: NodeTypes.imageBlock,
    align: validAlign,
    alt,
    border: toBool(border),
    sizing,
    src: url,
    title,
    width: sizing,
    data: {
      hName: 'img',
      hProperties,
    },
    position,
  };
};

/**
 * Transform a magic block embed node into an EmbedBlock.
 * Magic block embeds have structure: { type: 'embed', children, data.hProperties }
 */
const transformMagicBlockEmbed = (node: MagicBlockEmbed): EmbedBlock => {
  const { data, position } = node;
  const hProps = data?.hProperties || {};
  const {
    favicon,
    height,
    href,
    html,
    iframe,
    image,
    provider,
    providerName,
    providerUrl,
    title = '',
    typeOfEmbed,
    url = '',
    width,
  } = hProps;

  return {
    type: NodeTypes.embedBlock,
    title,
    url,
    data: {
      hName: 'embed',
      hProperties: {
        title,
        url,
        ...(favicon && { favicon }),
        ...(height && { height }),
        ...(href && { href }),
        ...(html && { html }),
        ...(iframe !== undefined && { iframe }),
        ...(image && { image }),
        ...(typeOfEmbed && { typeOfEmbed }),
        ...(providerName && { providerName }),
        ...(providerUrl && { providerUrl }),
        ...(provider && { provider }),
        ...(width && { width }),
      },
    },
    position,
  };
};

const isTableCell = (node: Node): node is MdxJsxFlowElement & { name: 'td' | 'th' } =>
  isMDXElement(node) && ['th', 'td'].includes((node as MdxJsxFlowElement).name);

/**
 * Converts a JSX <Table> element to an MDAST table node with alignment.
 * Returns null for header-less tables since MDAST always promotes the first row to <thead>.
 */
const transformTable = (jsx: MdxJsxFlowElement): MdxishTable | null => {
  let hasThead = false;
  visit(jsx as Node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name === 'thead') hasThead = true;
  });

  if (!hasThead) return null;

  const { align: alignAttr } = getAttrs<Pick<Table, 'align'>>(jsx);
  const align = Array.isArray(alignAttr) ? alignAttr : null;

  const rows: MdxishTableRow[] = [];

  visit(jsx as Node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name !== 'thead' && child.name !== 'tbody') return;

    visit(child as Node, isMDXElement, (row: MdxJsxFlowElement | MdxJsxTextElement) => {
      if (row.name !== 'tr') return;

      const cells: MdxishTableCell[] = [];

      visit(row as Node, isTableCell, (cell: MdxJsxFlowElement & { name: 'td' | 'th' }) => {
        const parsedChildren = unwrapSoleParagraph(cell.children as Node[]);

        cells.push({
          type: 'tableCell',
          children: parsedChildren,
          position: cell.position,
        });
      });

      rows.push({
        type: 'tableRow',
        children: cells,
        position: row.position,
      });
    });
  });

  const columnCount = rows[0]?.children?.length || 0;
  const alignArray: Table['align'] =
    align && columnCount > 0
      ? align.slice(0, columnCount).concat(Array.from({ length: Math.max(0, columnCount - align.length) }, () => null))
      : Array.from({ length: columnCount }, () => null);

  const table: MdxishTable = {
    type: 'table',
    align: alignArray,
    position: jsx.position,
    children: rows,
  };

  return table;
};

/**
 * Transforms a `<figure>` JSX element into a FigureNode.
 * Inside JSX tables with blank lines, the parser treats `<figure>` as an mdxJsxFlowElement
 * containing a paragraph with the image and a `<figcaption>` mdxJsxTextElement as children.
 */
const transformFigure = (jsx: MdxJsxFlowElement): FigureNode | null => {
  let imageNode: RootContent | undefined;
  let captionText: string | undefined;

  visit(jsx as Node as Parent, (child: Node) => {
    if (!imageNode && (child.type === 'image' || (child.type as string) === NodeTypes.imageBlock)) {
      imageNode = child as RootContent;
    }
    if (!captionText && child.type === 'mdxJsxTextElement' && (child as MdxJsxTextElement).name === 'figcaption') {
      captionText = extractText((child as MdxJsxTextElement).children as RootContent[]);
    }
  });

  if (!imageNode) return null;

  return buildFigureNode(imageNode, captionText, jsx.position);
};

type ComponentTransformer = (jsx: MdxJsxFlowElement) => Node | null;

const COMPONENT_MAP: Record<string, ComponentTransformer> = {
  Callout: transformCallout,
  Embed: transformEmbed,
  Image: transformImage,
  figure: transformFigure,
  Recipe: transformRecipe,
  Table: transformTable,
};

/**
 * Transform mdxJsxFlowElement nodes, magic block nodes, and HTML figure elements
 * into proper MDAST node types.
 *
 * This transformer runs after mdxishComponentBlocks and converts:
 * - JSX component elements (Image, Callout, Embed, Recipe, figure) into their corresponding MDAST types
 * - Magic block image nodes (type: 'image') into image-block
 * - Magic block embed nodes (type: 'embed') into embed-block
 * - Fragmented HTML <figure> blocks (from terminateHtmlFlowBlocks) back into figure nodes
 * - Figure nodes (from magic blocks, HTML, or JSX) into flat image-block with caption string
 * - Normalizes all image-block attrs (border, align, sizing, caption) to a consistent shape
 *
 * This is controlled by the `newEditorTypes` flag to maintain backwards compatibility.
 */
const mdxishJsxToMdast: Plugin<[], Parent> = () => tree => {
  // Block JSX components (Image, Callout, Embed, Recipe)
  visit(tree, 'mdxJsxFlowElement', (node: MdxJsxFlowElement, index, parent: Parent | undefined) => {
    if (!parent || index === undefined || !node.name) return;

    const transformer = COMPONENT_MAP[node.name];
    if (!transformer) return;

    const newNode = transformer(node);
    if (!newNode) return;

    // Replace the JSX node with the MDAST node
    (parent.children as Node[])[index] = newNode;
  });

  // Inline JSX components (Anchor)
  visit(tree, 'mdxJsxTextElement', (node: MdxJsxTextElement, index, parent: Parent | undefined) => {
    if (!parent || index === undefined || !node.name) return;

    if (node.name === 'Anchor') {
      const newNode = transformAnchor(node);
      (parent.children as Node[])[index] = newNode;
    }
  });

  // Transform magic block images (type: 'image') to image-block
  // Images inside paragraphs are standard markdown — handled by imageTransformer, normalized below
  visit(tree, 'image', (node: MagicBlockImage, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return SKIP;
    if (parent.type === 'paragraph') return SKIP;

    const newNode = transformMagicBlockImage(node);
    (parent.children as Node[])[index] = newNode;

    return SKIP;
  });

  // Transform magic block embeds (type: 'embed') to embed-block
  visit(tree, 'embed', (node: MagicBlockEmbed, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return SKIP;

    const newNode = transformMagicBlockEmbed(node);
    (parent.children as Node[])[index] = newNode;

    return SKIP;
  });

  // Reassembling fragmented HTML <figure> blocks into proper figure/figcaption nodes
  // this will then later be transformed into image-block nodes by imageTransformer
  reassembleHtmlFigures(tree as Parent);

  // Flatten figure nodes (magic blocks with captions) into image-block nodes
  const isFigure = (node: Node): node is FigureNode => node.type === 'figure';
  visit(tree, isFigure, (node, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const imageChild = node.children.find(
      child => child.type === 'image' || (child.type as string) === NodeTypes.imageBlock,
    );
    if (!imageChild) return;

    const figcaptionChild = node.children.find(child => child.type === 'figcaption') as
      | { children: RootContent[] }
      | undefined;

    // If the image was already transformed to image-block by the earlier visitor, use it directly
    const imageBlock =
      (imageChild.type as string) === NodeTypes.imageBlock
        ? (imageChild as unknown as ImageBlock)
        : transformMagicBlockImage(imageChild as MagicBlockImage);

    if (figcaptionChild?.children) {
      const caption = extractText(figcaptionChild.children);
      if (caption) {
        imageBlock.caption = caption;
        imageBlock.data.hProperties.caption = caption;
      }
    }

    (parent.children as Node[])[index] = imageBlock;
  });

  // Final normalization pass across all image-block nodes
  // Ensures consistent types (border→boolean, align→ImageAlign, width→sizing) and cleans up artifacts
  const isImageBlock = (node: Node): node is ImageBlock => (node.type as string) === NodeTypes.imageBlock;
  visit(tree, isImageBlock, _node => {
    const node = _node as ImageBlock;
    const hProps = (node.data?.hProperties || {}) as Record<string, unknown>;

    // Normalize boolean attrs
    if (hProps.border !== undefined) {
      const val = toBool(hProps.border as boolean | string);
      node.border = val;
      hProps.border = val;
    } else if (node.border !== undefined) {
      node.border = toBool(node.border as boolean | string);
    }

    // Validate align
    const validAlign = toImageAlign(hProps.align as string) || toImageAlign(node.align as unknown as string);
    node.align = validAlign;
    if (validAlign) {
      hProps.align = validAlign;
    } else {
      delete hProps.align;
    }

    // Map width → sizing
    const width = (hProps.width as string) || node.width;
    if (width) {
      node.sizing = width;
      node.width = width;
      hProps.sizing = width;
      hProps.width = width;
    }

    // Normalize caption
    const caption = (hProps.caption as string) || node.caption;
    if (caption) {
      node.caption = caption;
      hProps.caption = caption;
    }

    // Normalize src (url → src)
    node.src = (hProps.src as string) || node.src;
    hProps.src = node.src;

    // Remove stray children array from imageTransformer, but preserve caption children
    if (!caption) {
      delete (node as unknown as Record<string, unknown>).children;
    }
    delete hProps.children;
  });

  return tree;
};

export default mdxishJsxToMdast;
