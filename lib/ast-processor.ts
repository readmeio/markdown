import type { PluggableList } from 'unified';

import rehypeSlug from 'rehype-slug';
import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';

import transformers, {
  mermaidTransformer,
  readmeComponentsTransformer,
  variablesTransformer,
} from '../processor/transform';

export interface MdastOpts {
  components?: Record<string, string>;
  remarkPlugins?: PluggableList;
}

export const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers];
export const rehypePlugins = [rehypeSlug, mermaidTransformer];

const astProcessor = (opts: MdastOpts = { components: {} }) =>
  remark()
    .use(remarkMdx)
    .use(remarkPlugins)
    .use(opts.remarkPlugins)
    .use(variablesTransformer, { asMdx: false })
    .use(readmeComponentsTransformer({ components: opts.components }));

export default astProcessor;
