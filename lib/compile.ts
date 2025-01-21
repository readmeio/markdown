import { compileSync, CompileOptions } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import { defaultTransforms, variablesTransformer } from '../processor/transform';
import { rehypeToc } from '../processor/plugin/toc';
import MdxSyntaxError from '../errors/mdx-syntax-error';
import { rehypePlugins } from './ast-processor';

export type CompileOpts = CompileOptions & {
  lazyImages?: boolean;
  safeMode?: boolean;
  components?: Record<string, string>;
  copyButtons?: boolean;
};

const { codeTabsTransformer, tailwindRootTransformer, ...transforms } = defaultTransforms;

const compile = (text: string, { components, copyButtons, ...opts }: CompileOpts = {}) => {
  console.log(Object.keys(defaultTransforms));
  try {
    const vfile = compileSync(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins: [
        remarkFrontmatter,
        remarkGfm,
        ...Object.values(transforms),
        [codeTabsTransformer, { copyButtons }],
        tailwindRootTransformer({ components }),
      ],
      rehypePlugins: [...rehypePlugins, [rehypeToc, { components }]],
      ...opts,
    });

    return String(vfile)
      .replace(/await import\(_resolveDynamicMdxSpecifier\(('react'|"react")\)\)/, 'arguments[0].imports.React')
      .replace('"use strict";', '"use strict";\nconst { user } = arguments[0].imports;');
  } catch (error) {
    throw error.line ? new MdxSyntaxError(error, text) : error;
  }
};

export default compile;
