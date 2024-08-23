import { unified } from 'unified';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

import compilers from '../processor/compile';
import { divTransformer, readmeToMdx, tablesToJsx } from '../processor/transform';

export const mdx = (tree: any, { hast = false } = {}) => {
  const processor = unified()
    .use(hast ? rehypeRemark : undefined)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(divTransformer)
    .use(readmeToMdx)
    .use(tablesToJsx)
    .use(compilers)
    .use(remarkStringify);

  return processor.stringify(processor.runSync(tree));
};

export default mdx;
