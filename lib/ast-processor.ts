import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import transformers, { readmeComponentsTransformer, variablesTransformer } from '../processor/transform';
import rehypeSlug from 'rehype-slug';
import { PluggableList } from 'unified';

export type MdastOpts = {
  components?: Record<string, string>;
  remarkPlugins?: PluggableList;
};

export const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers];
export const rehypePlugins = [rehypeSlug];

const astProcessor = (opts: MdastOpts = { components: {} }) =>
  remark()
    .use(remarkMdx)
    .use(remarkPlugins)
    .use(opts.remarkPlugins)
    .use(variablesTransformer, { asMdx: false })
    .use(readmeComponentsTransformer({ components: opts.components }));

export default astProcessor;
