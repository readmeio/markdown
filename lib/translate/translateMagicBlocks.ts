import remarkParse from 'remark-parse';
import { unified } from 'unified';

import magicBlockTransformer from '../../processor/transform/mdxish/magic-blocks/magic-block-transformer';
import { magicBlockFromMarkdown } from '../mdast-util/magic-block';
import { magicBlock } from '../micromark/magic-block';
import { MAGIC_BLOCK_REGEX } from '../utils/extractMagicBlocks';

import translateImageBlock from './image';
import { isMdastRoot, type BlockTranslator } from './utils';

// Prefix subset of MAGIC_BLOCK_REGEX (lib/utils/extractMagicBlocks.ts:14);
// peeks at the block type so we can dispatch without re-scanning the full span.
const MAGIC_BLOCK_OPEN_RE = /^\[block:([^\]]{1,100})\]/;

const processor = unified()
  .data('micromarkExtensions', [magicBlock()])
  .data('fromMarkdownExtensions', [magicBlockFromMarkdown()])
  .use(remarkParse)
  .use(magicBlockTransformer, { safeMode: true });

function countNewlines(value: string) {
  return value.split('\n').length - 1;
}

const translateImage: BlockTranslator = raw => {
  try {
    const tree = processor.runSync(processor.parse(raw));
    if (!isMdastRoot(tree)) return raw;

    const translated = translateImageBlock(raw, tree);
    if (!translated) return raw;

    const originalNewlineCount = countNewlines(raw);
    const translatedNewlineCount = countNewlines(translated);
    if (translatedNewlineCount > originalNewlineCount) return raw;

    return translated + '\n'.repeat(originalNewlineCount - translatedNewlineCount);
  } catch {
    return raw;
  }
};

const translators: Partial<Record<string, BlockTranslator>> = {
  image: translateImage,
};

function translateMagicBlock(raw: string) {
  const blockType = raw.match(MAGIC_BLOCK_OPEN_RE)?.[1];
  const translator = blockType ? translators[blockType] : undefined;

  return translator ? translator(raw) : raw;
}

/**
 * Translates supported legacy magic blocks into MDX-shaped markdown while
 * preserving the source document's line count.
 *
 * Currently registered: `image`. Other block types pass through unchanged.
 * To register a new translator, add an entry to the `translators` map in this
 * file; each translator owns its own parse/validate/serialize per block shape.
 */
export default function translateMagicBlocks(content: string) {
  MAGIC_BLOCK_REGEX.lastIndex = 0;
  return content.replace(MAGIC_BLOCK_REGEX, match => translateMagicBlock(match));
}
