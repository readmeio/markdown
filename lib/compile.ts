import type { CompileOptions } from '@mdx-js/mdx';
import type { PluggableList } from 'unified';

import { compileSync as mdxCompileSync } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import MdxSyntaxError from '../errors/mdx-syntax-error';
import { rehypeToc } from '../processor/plugin/toc';
import { defaultTransforms, tailwindTransformer, handleMissingComponents } from '../processor/transform';

import { rehypePlugins } from './ast-processor';

export type CompileOpts = CompileOptions & {
  components?: Record<string, string>;
  copyButtons?: boolean;
  missingComponents?: 'ignore' | 'throw';
  useTailwind?: boolean;
};

const { codeTabsTransformer, ...transforms } = defaultTransforms;

const compile = (
  text: string,
  { components = {}, missingComponents, copyButtons, useTailwind, ...opts }: CompileOpts = {},
) => {
  const remarkPlugins: PluggableList = [
    remarkFrontmatter,
    remarkGfm,
    ...Object.values(transforms),
    [codeTabsTransformer, { copyButtons }],
    [
      handleMissingComponents,
      { components, missingComponents: ['ignore', 'throw'].includes(missingComponents) ? missingComponents : 'ignore' },
    ],
  ];

  if (useTailwind) {
    remarkPlugins.push([tailwindTransformer, { components }]);
  }

  try {
    const vfile = mdxCompileSync(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins,
      rehypePlugins: [...rehypePlugins, [rehypeToc, { components }]],
      ...opts,
    });

    const string = String(vfile)
      .replaceAll(/await import\(_resolveDynamicMdxSpecifier\(('react'|"react")\)\)/g, 'arguments[0].imports.React')
      .replace('"use strict";', '"use strict";\nconst { user } = arguments[0].imports;\n');
    return string;
  } catch (error) {
    throw error.line ? new MdxSyntaxError(error, text) : error;
  }
};

export default compile;
