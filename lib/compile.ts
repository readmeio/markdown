import { compileSync, CompileOptions } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

import transformers from '../processor/transform';
import { rehypeToc } from '../processor/plugin/toc';
import MdxSyntaxError from '../errors/mdx-syntax-error';

export type CompileOpts = CompileOptions & {
  lazyImages?: boolean;
  safeMode?: boolean;
  components?: Record<string, string>;
};

const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers];

const compile = (text: string, { components, ...opts }: CompileOpts = {}) => {
  try {
    const vfile = compileSync(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins,
      rehypePlugins: [rehypeSlug, [rehypeToc, { components }]],
      ...opts,
    });

    return String(vfile).replace(
      /await import\(_resolveDynamicMdxSpecifier\(('react'|"react")\)\)/,
      'arguments[0].imports.React',
    );
  } catch (error) {
    throw error.line ? new MdxSyntaxError(error, text) : error;
  }
};

export default compile;
