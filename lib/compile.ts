import { compile as mdxCompile, CompileOptions } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import { defaultTransforms, tailwindRootTransformer } from '../processor/transform';
import { rehypeToc } from '../processor/plugin/toc';
import MdxSyntaxError from '../errors/mdx-syntax-error';
import { rehypePlugins } from './ast-processor';
import { CustomComponents } from '../types';

export type CompileOpts = CompileOptions & {
  lazyImages?: boolean;
  safeMode?: boolean;
  components?: CustomComponents;
  copyButtons?: boolean;
};

const { codeTabsTransformer, ...transforms } = defaultTransforms;

const compile = async (text: string, { components = {}, copyButtons, ...opts }: CompileOpts = {}) => {
  try {
    const vfile = await mdxCompile(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins: [
        remarkFrontmatter,
        remarkGfm,
        ...Object.values(transforms),
        [codeTabsTransformer, { copyButtons }],
        [tailwindRootTransformer, { components }],
      ],
      rehypePlugins: [...rehypePlugins, [rehypeToc, { components }]],
      ...opts,
    });

    return String(vfile).replace('"use strict";', '"use strict";\nconst { React, user } = arguments[0].imports;\n');
  } catch (error) {
    throw error.line ? new MdxSyntaxError(error, text) : error;
  }
};

export default compile;
