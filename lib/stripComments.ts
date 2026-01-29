import { VARIABLE_REGEXP } from '@readme/variable';
import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import normalizeEmphasisAST from '../processor/transform/mdxish/normalize-malformed-md-syntax';
import { stripCommentsTransformer } from '../processor/transform/stripComments';

import { magicBlockFromMarkdown, magicBlockToMarkdown } from './mdast-util/magic-block';
import { magicBlock } from './micromark/magic-block';

interface Opts {
  mdx?: boolean;
  mdxish?: boolean;
}

/**
 * Removes Markdown and MDX comments.
 */
async function stripComments(doc: string, { mdx, mdxish }: Opts = {}): Promise<string> {
  const processor = unified()
    .data('micromarkExtensions', [magicBlock()])
    .data('fromMarkdownExtensions', [magicBlockFromMarkdown()])
    .data('toMarkdownExtensions', [magicBlockToMarkdown()]);

  // we still require these two extensions because:
  // 1. we can rely on remarkMdx to parse MDXish
  // 2. we need to parse JSX comments into mdxTextExpression nodes so that the transformers can pick them up
  if (mdxish) {
    processor
      .data('micromarkExtensions', [mdxExpression({ allowEmpty: true })])
      .data('fromMarkdownExtensions', [mdxExpressionFromMarkdown()]);
  }

  processor
    .use(remarkParse)
    .use(normalizeEmphasisAST)
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
            join: [
              // Preserve tight sibling code blocks without adding extra newlines between them.
              // Our markdown renderer uses this to group these code blocks into a tabbed interface.
              (left, right) => {
                if (left.type === 'code' && right.type === 'code') {
                  const isTight =
                    left.position &&
                    right.position &&
                    right.position.start.line - left.position.end.line === 1; // Are the blocks on adjacent lines?
                  
                  // 0 = no newline between blocks
                  return isTight ? 0 : undefined;
                }
                return undefined;
              },
            ],
          },
    );

  const file = await processor.process(doc);
  return String(file).trim();
}

export default stripComments;
