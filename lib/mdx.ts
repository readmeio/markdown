import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';

import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import compilers from '../processor/compile';
import { compatabilityTransfomer, divTransformer, readmeToMdx, tablesToJsx } from '../processor/transform';

export const mdx = (tree: HastRoot | MdastRoot, { hast = false, remarkTransformers = [], ...opts } = {}) => {
  const processor = unified()
    .use(hast ? rehypeRemark : undefined)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkTransformers)
    .use(divTransformer)
    .use(readmeToMdx)
    .use(tablesToJsx)
    .use(compatabilityTransfomer)
    .use(compilers)
    .use(remarkStringify, opts);

  // @ts-expect-error - @todo: coerce the processor and tree to the correct
  // type depending on the value of hast
  return processor.stringify(processor.runSync(tree));
};

export default mdx;
