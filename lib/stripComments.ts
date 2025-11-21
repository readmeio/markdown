import { VARIABLE_REGEXP } from '@readme/variable';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import { stripCommentsTransformer } from '../processor/transform/stripComments';

import { extractMagicBlocks, restoreMagicBlocks } from './utils/extractMagicBlocks';

interface Opts {
  mdx?: boolean;
}

/**
 * Removes Markdown and MDX comments.
 */
async function stripComments(doc: string, { mdx }: Opts = {}): Promise<string> {
  const { replaced, blocks } = extractMagicBlocks(doc);

  const processor = unified()
    .use(remarkParse)
    .use(mdx ? remarkMdx : undefined)
    .use(stripCommentsTransformer)
    .use(
      remarkStringify,
      mdx
        ? {}
        : {
            handlers: {
              // Preserve <<...>> variables without escaping any angle brackets.
              text(node, _, state, info) {
                // If text contains <<...>> pattern, return as is.
                if (new RegExp(VARIABLE_REGEXP).test(node.value)) return node.value;

                // Otherwise, handle each text node normally.
                return state.safe(node.value, info);
              },
            },
          },
    );

  const file = await processor.process(replaced);
  const stringified = String(file).trim();

  const restored = restoreMagicBlocks(stringified, blocks);
  return restored;
}

export default stripComments;
