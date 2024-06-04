import { compileSync, CompileOptions } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

import transformers, { rehypeToc } from '../processor/transform';
import { VFileWithToc } from '../types';
import MdxSyntaxError from '../errors/mdx-syntax-error';
import mdx from './mdx';

export type CompileOpts = CompileOptions & {
  components?: Record<string, VFileWithToc>;
  lazyImages?: boolean;
  safeMode?: boolean;
};

const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers];

const compile = (text: string, opts: CompileOpts = {}) => {
  const { components } = opts;

  const exec = (string: string): VFileWithToc => {
    try {
      return compileSync(string, {
        outputFormat: 'function-body',
        providerImportSource: '#',
        remarkPlugins,
        rehypePlugins: [rehypeSlug, [rehypeToc, { components }]],
        ...opts,
      });
    } catch (error) {
      throw error.line ? new MdxSyntaxError(error, text) : error;
    }
  };

  const vfile = exec(text);
  if (vfile.data.toc.ast) {
    const toc = mdx(vfile.data.toc.ast, { hast: true });

    if (toc) {
      vfile.data.toc.vfile = exec(toc);
    }
  } else {
    delete vfile.data.toc;
  }

  vfile.value = String(vfile)
    .replace(/await import\(_resolveDynamicMdxSpecifier\(('react'|"react")\)\)/, 'arguments[0].imports.React')
    .replace(/"use strict";/, `"use strict";\nconst { variables } = arguments[0]`);

  console.log(vfile.value);

  return vfile;
};

export default compile;
