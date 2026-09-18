import type { MdastNode } from '../../processor/transform/mdxish/magic-blocks/types';
import type { Root as MdastRoot } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { toAttributes } from '../../processor/utils';
import { mdxishMdastToMd } from '../mdxish';

import {
  getChildren,
  isRecord,
  type MagicBlockFigure,
  type MagicBlockImageNode,
} from './utils';

const IMAGE_BLOCK_BODY_RE = /^\[block:image\]([\s\S]*)\[\/block\]$/;

function isMagicBlockImage(node: MdastNode): node is MagicBlockImageNode {
  return node.type === 'image';
}

function isMagicBlockFigure(node: MdastNode): node is MagicBlockFigure {
  return node.type === 'figure' && Array.isArray(node.children);
}

function hasImageBlockData(raw: string) {
  const body = raw.match(IMAGE_BLOCK_BODY_RE)?.[1];
  if (!body) return false;

  try {
    const parsed: unknown = JSON.parse(body.trim());
    if (!isRecord(parsed) || !Array.isArray(parsed.images)) return false;

    return parsed.images.some(image => {
      if (!isRecord(image) || !Array.isArray(image.image)) return false;
      return typeof image.image[0] === 'string';
    });
  } catch {
    return false;
  }
}

function stringifyCaption(node: MdastNode): string {
  if (typeof node.value === 'string') return node.value;
  if (node.type === 'break') return '\n';

  return getChildren(node).map(stringifyCaption).join('');
}

function imageToMdx(node: MagicBlockImageNode, caption?: string) {
  const hProperties = node.data?.hProperties ?? {};
  // hProperties.border declared as `string` upstream; runtime is actually boolean
  // (see magic-block-transformer.ts:424). Read as unknown and coerce here rather
  // than widen the upstream type. Drift cleanup is filed as a follow-up.
  const rawBorder = (hProperties as { border?: unknown }).border;
  const borderValue = typeof rawBorder === 'boolean' ? rawBorder : undefined;
  const src = node.url;

  if (!src) return null;

  const attributes = {
    align: hProperties.align,
    alt: node.alt ?? '',
    border: borderValue,
    caption,
    title: node.title || undefined,
    width: hProperties.width,
    src,
  };

  return {
    type: 'mdxJsxFlowElement',
    name: 'Image',
    attributes: toAttributes(attributes, ['align', 'alt', 'border', 'caption', 'title', 'width', 'src'], {
      preserveEmpty: ['alt'],
      preserveFalse: ['border'],
    }),
    children: [],
  } satisfies MdxJsxFlowElement;
}

function figureToMdx(node: MagicBlockFigure) {
  const image = getChildren(node).find(isMagicBlockImage);
  const figcaption = getChildren(node).find(child => child.type === 'figcaption');
  const caption = figcaption ? getChildren(figcaption).map(stringifyCaption).join('').trim() : undefined;

  return image ? imageToMdx(image, caption || undefined) : null;
}

function transformedNodeToMdx(node: MdastNode) {
  if (isMagicBlockImage(node)) return imageToMdx(node);
  if (isMagicBlockFigure(node)) return figureToMdx(node);

  if (node.type === 'rdme-pin') {
    const child = getChildren(node).find(item => item.type === 'image' || item.type === 'figure');
    return child ? transformedNodeToMdx(child) : null;
  }

  return null;
}

function stringifyMdxImage(tree: MdastRoot) {
  const children = getChildren(tree);
  const node = children.find(item => item.type === 'image' || item.type === 'figure' || item.type === 'rdme-pin');
  const mdxNode = node ? transformedNodeToMdx(node) : null;

  if (!mdxNode) return null;

  return mdxishMdastToMd({ type: 'root', children: [mdxNode] }).trim();
}

/**
 * Translates a single [block:image] span into <Image /> JSX via the magic-block
 * transformer + mdxishMdastToMd. Returns the original span on parse failure or
 * when no figure/image node is produced. Newline padding is applied by the caller.
 */
export default function translateImageBlock(raw: string, tree: MdastRoot) {
  if (!hasImageBlockData(raw)) return raw;

  const translated = stringifyMdxImage(tree);
  if (!translated) return raw;

  return translated;
}
