import remarkParse from 'remark-parse';
import { unified } from 'unified';

import magicBlockTransformer from '../processor/transform/mdxish/magic-blocks/magic-block-transformer';

import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { magicBlock } from './micromark/magic-block';
import { MAGIC_BLOCK_REGEX } from './utils/extractMagicBlocks';

type AttributeValue = boolean | number | string;

interface SerializableNode {
  alt?: unknown;
  children?: SerializableNode[];
  data?: unknown;
  title?: unknown;
  type?: unknown;
  url?: unknown;
  value?: unknown;
}

const IMAGE_BLOCK_OPEN_RE = /^\[block:image\]/;
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

function isSerializableNode(value: unknown): value is SerializableNode {
  return isRecord(value);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function getChildren(value: unknown) {
  return isRecord(value) && Array.isArray(value.children) ? value.children.filter(isSerializableNode) : [];
}

function getHProperties(node: SerializableNode) {
  if (!isRecord(node.data) || !isRecord(node.data.hProperties)) return {};
  return node.data.hProperties;
}

function parseImageBlock(raw: string) {
  const body = raw.match(IMAGE_BLOCK_BODY_RE)?.[1];
  if (!body) return null;

  try {
    const parsed: unknown = JSON.parse(body.trim());
    if (!isRecord(parsed) || !Array.isArray(parsed.images)) return null;

    return parsed.images.some(image => {
      if (!isRecord(image) || !Array.isArray(image.image)) return false;
      return typeof image.image[0] === 'string';
    })
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function requiresJsxExpressionAttribute(value: string) {
  return [...value].some(character => {
    const charCode = character.charCodeAt(0);
    return UNSAFE_JSX_ATTRIBUTE_CHARS.has(character) || charCode < 32 || charCode === 127;
  });
}

function formatAttribute(key: string, value: AttributeValue) {
  if (typeof value === 'boolean' || typeof value === 'number') return `${key}={${JSON.stringify(value)}}`;
  if (requiresJsxExpressionAttribute(value)) return `${key}={${JSON.stringify(value)}}`;
  return `${key}="${value}"`;
}

function formatAttributes(attributes: [string, AttributeValue | undefined][]) {
  return attributes
    .flatMap(([key, value]) => (value === undefined ? [] : [formatAttribute(key, value)]))
    .join(' ');
}

function stringifyCaption(node: SerializableNode): string {
  if (typeof node.value === 'string') return node.value;
  if (node.type === 'break') return '\n';

  return getChildren(node).map(stringifyCaption).join('');
}

function serializeImage(node: SerializableNode, caption?: string) {
  const hProperties = getHProperties(node);
  const alt = getString(node.alt);
  const title = getString(node.title);
  const src = getString(hProperties.src) || getString(node.url);

  if (!src) return null;

  const attributes: [string, AttributeValue | undefined][] = [
    ['align', getString(hProperties.align)],
    ['alt', alt],
    ['border', typeof hProperties.border === 'boolean' ? hProperties.border : undefined],
    ['caption', caption],
    ['title', title || undefined],
    ['width', getString(hProperties.width)],
    ['src', src],
  ];

  return `<Image ${formatAttributes(attributes)} />`;
}

function serializeFigure(node: SerializableNode) {
  const image = getChildren(node).find(child => child.type === 'image');
  const figcaption = getChildren(node).find(child => child.type === 'figcaption');
  const caption = figcaption ? getChildren(figcaption).map(stringifyCaption).join('').trim() : undefined;

  return image ? serializeImage(image, caption || undefined) : null;
}

function serializeTransformedNode(node: SerializableNode): string | null {
  if (node.type === 'image') return serializeImage(node);
  if (node.type === 'figure') return serializeFigure(node);

  if (node.type === 'rdme-pin') {
    const child = getChildren(node).find(item => item.type === 'image' || item.type === 'figure');
    return child ? serializeTransformedNode(child) : null;
  }

  return null;
}

function serializeTransformedBlock(tree: unknown) {
  const children = getChildren(tree);
  const node = children.find(item => item.type === 'image' || item.type === 'figure' || item.type === 'rdme-pin');

  return node ? serializeTransformedNode(node) : null;
}

function translateImageBlock(raw: string) {
  if (!IMAGE_BLOCK_OPEN_RE.test(raw) || !parseImageBlock(raw)) return raw;

  try {
    const translated = serializeTransformedBlock(processor.runSync(processor.parse(raw)));
    if (!translated) return raw;

    const originalNewlineCount = countNewlines(raw);
    const translatedNewlineCount = countNewlines(translated);
    if (translatedNewlineCount > originalNewlineCount) return raw;

    return translated + '\n'.repeat(originalNewlineCount - translatedNewlineCount);
  } catch {
    return raw;
  }
}

/**
 * Translates supported legacy magic blocks into MDX-shaped markdown while
 * preserving the source document's line count.
 */
export default function translateMagicBlocks(content: string) {
  MAGIC_BLOCK_REGEX.lastIndex = 0;
  return content.replace(MAGIC_BLOCK_REGEX, match => translateImageBlock(match));
}
