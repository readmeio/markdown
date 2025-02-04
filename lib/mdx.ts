import type { Root } from 'mdast';

import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import compilers from '../processor/compile';
import { compatabilityTransfomer, divTransformer, readmeToMdx, tablesToJsx } from '../processor/transform';

export const mdx = (tree: Root, { hast = false, ...opts } = {}) => {
  const processor = unified()
    .use(hast ? rehypeRemark : undefined)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(divTransformer)
    .use(readmeToMdx)
    .use(tablesToJsx)
    .use(compatabilityTransfomer)
    .use(compilers)
    .use(remarkStringify, opts);

  return processor.stringify(processor.runSync(tree));
};

export default mdx;
