import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import { stripCommentsTransformer } from '../processor/transform/stripComments';

interface Opts {
  mdx?: boolean;
}

/**
 * Removes Markdown and MDX comments.
 */
async function stripComments (doc: string, { mdx }: Opts = {}): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(mdx ? remarkMdx : undefined)
    .use(stripCommentsTransformer)
    .use(remarkStringify);

  const file = await processor.process(doc);
  return String(file);
}

export default stripComments;