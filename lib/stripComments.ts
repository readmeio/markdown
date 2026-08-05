import { VARIABLE_REGEXP } from '@readme/variable';
import { mdxExpressionToMarkdown } from 'mdast-util-mdx-expression';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import normalizeEmphasisAST from '../processor/transform/mdxish/normalize-malformed-md-syntax';
import { stripCommentsTransformer } from '../processor/transform/stripComments';

import { FEATURES, mdxishExtensions } from './micromark/mdxish-extensions';
import { extractMagicBlocks, restoreMagicBlocks } from './utils/extractMagicBlocks';

interface Opts {
  mdx?: boolean;
  mdxish?: boolean;
}

/**
 * Removes Markdown and MDX comments.
 */
async function stripComments(doc: string, { mdx, mdxish }: Opts = {}): Promise<string> {
  const { replaced, blocks } = extractMagicBlocks(doc);

  const processor = unified();

  // We can't lean on remarkMdx for MDXish, so these tokenizers keep each
  // construct in one node across the parse/stringify round trip: JSX comments
  // become mdxTextExpression nodes the transformer can find, `<HTMLBlock>` is
  // claimed before htmlFlow intercepts its inner tags, and a custom component
  // stays whole instead of having its tag escaped.
  if (mdxish) {
    const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(FEATURES.stripComments);

    processor
      .data('micromarkExtensions', micromarkExtensions)
      .data('fromMarkdownExtensions', fromMarkdownExtensions)
      .data('toMarkdownExtensions', [mdxExpressionToMarkdown()]);
  }

  processor
    .use(remarkParse)
    .use(normalizeEmphasisAST)
    .use(mdx ? remarkMdx : undefined)
    .use(stripCommentsTransformer)
    .use(remarkGfm)
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
            join: [
              // Preserve tight sibling code blocks without adding extra newlines between them.
              // Our markdown renderer uses this to group these code blocks into a tabbed interface.
              (left, right) => {
                if (left.type === 'code' && right.type === 'code') {
                  const isTight =
                    left.position && right.position && right.position.start.line - left.position.end.line === 1; // Are the blocks on adjacent lines?

                  // 0 = no newline between blocks
                  return isTight ? 0 : undefined;
                }
                return undefined;
              },
            ],
          },
    );

  const file = await processor.process(replaced);
  const stringified = String(file).trim();

  const restored = restoreMagicBlocks(stringified, blocks);
  return restored;
}

export default stripComments;
