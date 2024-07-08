import { unified } from 'unified';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

import compilers from '../processor/compile';
import readmeToMdx from '../processor/transform/readme-to-mdx';
import divTransformer from '../processor/transform';

export const mdx = (tree: any, { hast = false } = {}) => {
  const processor = unified()
    .use(hast ? rehypeRemark : undefined)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(divTransformer)
    .use(readmeToMdx)
    .use(remarkStringify)
    .use(compilers);

  return processor.stringify(processor.runSync(tree));
};

export default mdx;
