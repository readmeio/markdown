import { VARIABLE_REGEXP } from '@readme/variable';
import { mdxExpressionFromMarkdown, mdxExpressionToMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import normalizeEmphasisAST from '../processor/transform/mdxish/normalize-malformed-md-syntax';
import { stripCommentsTransformer } from '../processor/transform/stripComments';

import { jsxTableFromMarkdown } from './mdast-util/jsx-table';
import { jsxTable } from './micromark/jsx-table';
import { protectHTMLBlockContent, restoreHTMLBlockContent } from './utils/extractors/html-blocks';
import { extractMagicBlocks, restoreMagicBlocks } from './utils/extractors/magic-blocks';

interface Opts {
  mdx?: boolean;
  mdxish?: boolean;
}

/**
 * Removes Markdown and MDX comments.
 */
async function stripComments(doc: string, { mdx, mdxish }: Opts = {}): Promise<string> {
  // Preprocessing step: Don't touch magic blocks and HTML block content
  let preprocessedDoc = doc;
  const { replaced, blocks } = extractMagicBlocks(preprocessedDoc);
  preprocessedDoc = replaced;

  // We only need to protect HTML block content if we're in MDXish mode, and no
  if (mdxish) {
    preprocessedDoc = protectHTMLBlockContent(preprocessedDoc);
  }

  const processor = unified();

  // we still require these two extensions because:
  // 1. we can rely on remarkMdx to parse MDXish
  // 2. we need to parse JSX comments into mdxTextExpression nodes so that the transformers can pick them up
  if (mdxish) {
    processor
      .data('micromarkExtensions', [jsxTable(), mdxExpression({ allowEmpty: true })])
      .data('fromMarkdownExtensions', [jsxTableFromMarkdown(), mdxExpressionFromMarkdown()])
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

  const file = await processor.process(preprocessedDoc);
  const stringified = String(file).trim();

  let restored = stringified;
  if (mdxish) {
    restored = restoreHTMLBlockContent(restored);
  }
  restored = restoreMagicBlocks(restored, blocks);
  return restored;
}

export default stripComments;
