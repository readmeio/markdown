import { VARIABLE_REGEXP } from '@readme/variable';
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
}

/**
 * Removes Markdown and MDX comments.
 */
async function stripComments(doc: string, { mdx }: Opts = {}): Promise<string> {
  const processor = unified()
    .data('micromarkExtensions', [magicBlock()])
    .data('fromMarkdownExtensions', [magicBlockFromMarkdown()])
    .data('toMarkdownExtensions', [magicBlockToMarkdown()])
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
                // 0 = no newline between blocks
                return left.type === 'code' && right.type === 'code' ? 0 : undefined;
              },
            ],
          },
    );

  const file = await processor.process(doc);
  return String(file).trim();
}

export default stripComments;
