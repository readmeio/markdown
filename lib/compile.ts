import { compile as mdxCompile, CompileOptions } from '@mdx-js/mdx';
import { PluggableList } from 'unified';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import { defaultTransforms, tailwindTransformer } from '../processor/transform';
import { rehypeToc } from '../processor/plugin/toc';
import MdxSyntaxError from '../errors/mdx-syntax-error';
import { rehypePlugins } from './ast-processor';

export type CompileOpts = CompileOptions & {
  lazyImages?: boolean;
  safeMode?: boolean;
  components?: Record<string, string>;
  copyButtons?: boolean;
  useTailwind?: boolean;
};

const { codeTabsTransformer, ...transforms } = defaultTransforms;

const compile = async (text: string, { components = {}, copyButtons, useTailwind, ...opts }: CompileOpts = {}) => {
  const remarkPlugins: PluggableList = [
    remarkFrontmatter,
    remarkGfm,
    ...Object.values(transforms),
    [codeTabsTransformer, { copyButtons }],
  ];

  console.log(components);
  console.log('useTailwind', useTailwind);
  if (useTailwind) {
    remarkPlugins.push([tailwindTransformer, { components }]);
  }

  try {
    const vfile = await mdxCompile(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins,
      rehypePlugins: [...rehypePlugins, [rehypeToc, { components }]],
      ...opts,
    });

    return String(vfile).replace('"use strict";', '"use strict";\nconst { React, user } = arguments[0].imports;\n');
  } catch (error) {
    throw error.line ? new MdxSyntaxError(error, text) : error;
  }
};

export default compile;
