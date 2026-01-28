import type { Callout, EmbedBlock, ImageBlock, Recipe } from '../../../types';
import type { Image, Node, Parent, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { SKIP, visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { getAttrs } from '../../utils';

/**
 * Magic block image node structure (from magicBlockTransformer)
 */
interface MagicBlockImage extends Image {
  data?: {
    hProperties?: {
      align?: string;
      border?: string;
      width?: string;
    };
  };
}

/**
 * Magic block embed node structure (from magicBlockTransformer)
 */
interface MagicBlockEmbed extends Node {
  children?: RootContent[];
  data?: {
    hName?: string;
    hProperties?: {
      favicon?: string;
      href?: string;
      html?: string;
      image?: string;
      provider?: string;
      providerName?: string;
      providerUrl?: string;
      title?: string;
      url?: string;
    };
  };
  type: 'embed';
}

/**
 * Figure node that may contain an image (from magicBlockTransformer with caption)
 */
interface FigureNode extends Node {
  children: RootContent[];
  data?: {
    hName?: string;
  };
  type: 'figure';
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
  html?: string;
  iframe?: boolean;
  image?: string;
  providerName?: string;
  providerUrl?: string;
  title?: string;
  typeOfEmbed?: string;
  url?: string;
}

interface RecipeAttrs {
  backgroundColor?: string;
  emoji?: string;
  id?: string;
  link?: string;
  slug?: string;
  title?: string;
}

const transformImage = (jsx: MdxJsxFlowElement): ImageBlock => {
  const attrs = getAttrs<ImageAttrs>(jsx);
  const { align, alt = '', border, caption, className, height, lazy, src = '', title = '', width } = attrs;

  const hProperties: ImageBlock['data']['hProperties'] = {
    alt,
    src,
    title,
    ...(align && { align }),
    ...(border !== undefined && { border: String(border) }),
    ...(caption && { caption }),
    ...(className && { className }),
    ...(height !== undefined && { height: String(height) }),
    ...(lazy !== undefined && { lazy }),
    ...(width !== undefined && { width: String(width) }),
  };

  return {
    type: NodeTypes.imageBlock,
    align,
    alt,
    border: border !== undefined ? String(border) : undefined,
    caption,
    className,
    height: height !== undefined ? String(height) : undefined,
    lazy,
    src,
    title,
    width: width !== undefined ? String(width) : undefined,
    data: {
      hName: 'img',
      hProperties,
    },
    position: jsx.position,
  };
};

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

const transformEmbed = (jsx: MdxJsxFlowElement): EmbedBlock => {
  const attrs = getAttrs<EmbedAttrs>(jsx);
  const { favicon, html, iframe, image, providerName, providerUrl, title = '', url = '' } = attrs;

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
        ...(html && { html }),
        ...(iframe !== undefined && { iframe }),
        ...(image && { image }),
        ...(providerName && { providerName }),
        ...(providerUrl && { providerUrl }),
      },
    },
    position: jsx.position,
  };
};

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

  const hProperties: ImageBlock['data']['hProperties'] = {
    alt,
    src: url,
    title,
    ...(align && { align }),
    ...(border && { border }),
    ...(width && { width }),
  };

  return {
    type: NodeTypes.imageBlock,
    align,
    alt,
    border,
    src: url,
    title,
    width,
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
  const { favicon, html, image, providerName, providerUrl, title = '', url = '' } = hProps;

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
        ...(html && { html }),
        ...(image && { image }),
        ...(providerName && { providerName }),
        ...(providerUrl && { providerUrl }),
      },
    },
    position,
  };
};

type ComponentTransformer = (jsx: MdxJsxFlowElement) => RootContent;

const COMPONENT_MAP: Record<string, ComponentTransformer> = {
  Callout: transformCallout,
  Embed: transformEmbed,
  Image: transformImage,
  Recipe: transformRecipe,
};

/**
 * Transform mdxJsxFlowElement nodes and magic block nodes into proper MDAST node types.
 *
 * This transformer runs after mdxishComponentBlocks and converts:
 * - JSX component elements (Image, Callout, Embed, Recipe) into their corresponding MDAST types
 * - Magic block image nodes (type: 'image') into image-block
 * - Magic block embed nodes (type: 'embed') into embed-block
 * - Figure nodes containing images (from magic blocks with captions) - transforms the inner image
 *
 * This is controlled by the `newEditorTypes` flag to maintain backwards compatibility.
 */
const mdxishJsxToMdast: Plugin<[], Parent> = () => tree => {
  // Transform JSX components (Image, Callout, Embed, Recipe)
  visit(tree, 'mdxJsxFlowElement', (node: MdxJsxFlowElement, index, parent: Parent | undefined) => {
    if (!parent || index === undefined || !node.name) return;

    const transformer = COMPONENT_MAP[node.name];
    if (!transformer) return;

    const newNode = transformer(node);

    // Replace the JSX node with the MDAST node
    (parent.children as Node[])[index] = newNode;
  });

  // Transform magic block images (type: 'image') to image-block
  // Note: Standard markdown images are wrapped in paragraphs and handled by imageTransformer
  // Magic block images are direct children of root, so we handle them here
  visit(tree, 'image', (node: MagicBlockImage, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return SKIP;

    // Skip images inside paragraphs (those are standard markdown images handled by imageTransformer)
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

  // Transform images inside figure nodes (magic blocks with captions)
  const isFigure = (node: Node): node is FigureNode => node.type === 'figure';
  visit(tree, isFigure, node => {
    // Find and transform the image child
    node.children = node.children.map(child => {
      if (child.type === 'image') {
        return transformMagicBlockImage(child as MagicBlockImage);
      }
      return child;
    });
  });

  return tree;
};

export default mdxishJsxToMdast;
