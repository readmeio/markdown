import type { MdastNode, MagicBlockImage } from '../processor/transform/mdxish/magic-blocks/types';
import type { Root as MdastRoot } from 'mdast';
import type { MdxJsxAttribute, MdxJsxAttributeValueExpression, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { valueToEstree } from 'estree-util-value-to-estree';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import magicBlockTransformer from '../processor/transform/mdxish/magic-blocks/magic-block-transformer';

import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { mdxishMdastToMd } from './mdxish';
import { magicBlock } from './micromark/magic-block';
import { MAGIC_BLOCK_REGEX } from './utils/extractMagicBlocks';

type AttributeValue = boolean | number | string;

type MagicBlockTranslator = (raw: string) => string;

interface MagicBlockFigure extends MdastNode {
  children: MdastNode[];
  type: 'figure';
}

type MagicBlockImageNode = MagicBlockImage & MdastNode;

const MAGIC_BLOCK_OPEN_RE = /^\[block:([^\]]{1,100})\]/;
const IMAGE_BLOCK_BODY_RE = /^\[block:image\]([\s\S]*)\[\/block\]$/;
const UNSAFE_JSX_ATTRIBUTE_CHARS = new Set(['"', '\\', '<', '>', '{', '}']);

const processor = unified()
  .data('micromarkExtensions', [magicBlock()])
  .data('fromMarkdownExtensions', [magicBlockFromMarkdown()])
  .use(remarkParse)
  .use(magicBlockTransformer, { safeMode: true });

function countNewlines(value: string) {
  return value.split('\n').length - 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMdastNode(value: unknown): value is MdastNode {
  return isRecord(value) && typeof value.type === 'string';
}

function isMdastRoot(value: unknown): value is MdastRoot {
  return isRecord(value) && value.type === 'root' && Array.isArray(value.children);
}

function isMagicBlockImage(node: MdastNode): node is MagicBlockImageNode {
  return node.type === 'image';
}

function isMagicBlockFigure(node: MdastNode): node is MagicBlockFigure {
  return node.type === 'figure' && Array.isArray(node.children);
}

function getChildren(value: MdastNode | MdastRoot) {
  return Array.isArray(value.children) ? value.children.filter(isMdastNode) : [];
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

function requiresJsxExpressionAttribute(value: string) {
  return [...value].some(character => {
    const charCode = character.charCodeAt(0);
    return UNSAFE_JSX_ATTRIBUTE_CHARS.has(character) || charCode < 32 || charCode === 127;
  });
}

function formatAttribute(key: string, value: AttributeValue) {
  if (typeof value === 'string' && !requiresJsxExpressionAttribute(value)) {
    return { type: 'mdxJsxAttribute', name: key, value } satisfies MdxJsxAttribute;
  }

  const expressionValue = typeof value === 'string' ? JSON.stringify(value) : String(value);
  return {
    type: 'mdxJsxAttribute',
    name: key,
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: expressionValue,
      data: {
        estree: {
          type: 'Program',
          body: [{ type: 'ExpressionStatement', expression: valueToEstree(value) }],
          sourceType: 'module',
          comments: [],
        },
      },
    } satisfies MdxJsxAttributeValueExpression,
  } satisfies MdxJsxAttribute;
}

function formatAttributes(attributes: [string, AttributeValue | undefined][]): MdxJsxAttribute[] {
  return attributes
    .flatMap(([key, value]) => (value === undefined ? [] : [formatAttribute(key, value)]))
    .filter(attribute => attribute.value !== undefined);
}

function stringifyCaption(node: MdastNode): string {
  if (typeof node.value === 'string') return node.value;
  if (node.type === 'break') return '\n';

  return getChildren(node).map(stringifyCaption).join('');
}

function imageToMdx(node: MagicBlockImageNode, caption?: string) {
  const hProperties = node.data?.hProperties ?? {};
  const src = hProperties.src || node.url;

  if (!src) return null;

  const attributes: [string, AttributeValue | undefined][] = [
    ['align', hProperties.align],
    ['alt', node.alt ?? ''],
    ['border', hProperties.border],
    ['caption', caption],
    ['title', node.title || undefined],
    ['width', hProperties.width],
    ['src', src],
  ];

  return {
    type: 'mdxJsxFlowElement',
    name: 'Image',
    attributes: formatAttributes(attributes),
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

function translateImageBlock(raw: string) {
  if (!hasImageBlockData(raw)) return raw;

  try {
    const tree = processor.runSync(processor.parse(raw));
    if (!isMdastRoot(tree)) return raw;

    const translated = stringifyMdxImage(tree);
    if (!translated) return raw;

    const originalNewlineCount = countNewlines(raw);
    const translatedNewlineCount = countNewlines(translated);
    if (translatedNewlineCount > originalNewlineCount) return raw;

    return translated + '\n'.repeat(originalNewlineCount - translatedNewlineCount);
  } catch {
    return raw;
  }
}

const translators: Partial<Record<string, MagicBlockTranslator>> = {
  image: translateImageBlock,
};

function translateMagicBlock(raw: string) {
  const blockType = raw.match(MAGIC_BLOCK_OPEN_RE)?.[1];
  const translator = blockType ? translators[blockType] : undefined;

  return translator ? translator(raw) : raw;
}

/**
 * Translates supported legacy magic blocks into MDX-shaped markdown while
 * preserving the source document's line count.
 */
export default function translateMagicBlocks(content: string) {
  MAGIC_BLOCK_REGEX.lastIndex = 0;
  return content.replace(MAGIC_BLOCK_REGEX, match => translateMagicBlock(match));
}
