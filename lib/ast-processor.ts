import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import transformers, { readmeComponentsTransformer, variablesTransformer } from '../processor/transform';

export type MdastOpts = {
  components?: Record<string, string>;
};

export const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers, [variablesTransformer, { asMdx: false }]];

const astProcessor = (opts: MdastOpts = { components: {} }) =>
  remark()
    .use(remarkMdx)
    .use(remarkPlugins)
    .use(readmeComponentsTransformer({ components: opts.components }));

export default astProcessor;
