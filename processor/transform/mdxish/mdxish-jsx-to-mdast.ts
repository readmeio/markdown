import type { MagicBlockEmbed, MagicBlockFigure, MagicBlockImage } from './magic-blocks/types';
import type { Anchor, Callout, EmbedBlock, ImageAlign, ImageBlock, Recipe } from '../../../types';
import type { Node, Parent, PhrasingContent, RootContent } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { SKIP, visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { mdast } from '../../../lib';
import { getAttrs } from '../../utils';

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
  html?: string;
  iframe?: boolean;
  image?: string;
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
  const {
    favicon,
    height,
    html,
    iframe,
    image,
    providerName,
    providerUrl,
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
        ...(html && { html }),
        ...(iframe !== undefined && { iframe }),
        ...(image && { image }),
        ...(providerName && { providerName }),
        ...(providerUrl && { providerUrl }),
        ...(typeOfEmbed && { typeOfEmbed }),
        ...(width && { width }),
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
 * - Figure nodes (magic blocks with captions) into flat image-block with caption string
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

  // Flatten figure nodes (magic blocks with captions) into image-block nodes
  const isFigure = (node: Node): node is MagicBlockFigure => node.type === 'figure';
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
