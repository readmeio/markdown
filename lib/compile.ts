import type { CompileOptions } from '@mdx-js/mdx';

import { compileSync } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import MdxSyntaxError from '../errors/mdx-syntax-error';
import { rehypeToc } from '../processor/plugin/toc';
import { defaultTransforms } from '../processor/transform';

import { rehypePlugins } from './ast-processor';

export type CompileOpts = CompileOptions & {
  components?: Record<string, string>;
  copyButtons?: boolean;
  lazyImages?: boolean;
  safeMode?: boolean;
};

const { codeTabsTransformer, ...transforms } = defaultTransforms;

const compile = (text: string, { components, copyButtons, ...opts }: CompileOpts = {}) => {
  try {
    const vfile = compileSync(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins: [
        remarkFrontmatter,
        remarkGfm,
        ...Object.values(transforms),
        [codeTabsTransformer, { copyButtons }],
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
