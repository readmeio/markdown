import type { CompileOptions } from '@mdx-js/mdx';
import type { PluggableList } from 'unified';

import { compile as mdxCompile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import MdxSyntaxError from '../errors/mdx-syntax-error';
import { rehypeToc } from '../processor/plugin/toc';
import { defaultTransforms, tailwindTransformer } from '../processor/transform';
import { getExports } from '../processor/utils';

import { rehypePlugins } from './ast-processor';
import mdast from './mdast';

export type CompileOpts = CompileOptions & {
  components?: Record<string, string>;
  copyButtons?: boolean;
  useTailwind?: boolean;
  useTailwindRoot?: boolean;
};

const { codeTabsTransformer, ...transforms } = defaultTransforms;

const compile = async (
  text: string,
  { components = {}, copyButtons, useTailwind, useTailwindRoot, ...opts }: CompileOpts = {},
) => {
  const componentsByExport = Object.values(components).reduce(
    (memo, source) => {
      getExports(mdast(source)).forEach(exported => {
        if (['toc', 'Toc', 'default'].includes(exported)) return;

        memo[exported] = source;
      });

      return memo;
    },
    { ...components },
  );

  const remarkPlugins: PluggableList = [
    remarkFrontmatter,
    remarkGfm,
    ...Object.values(transforms),
    [codeTabsTransformer, { copyButtons }],
  ];

  if (useTailwind) {
    remarkPlugins.push([tailwindTransformer, { components: componentsByExport, parseRoot: useTailwindRoot }]);
  }

  try {
    const vfile = await mdxCompile(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins,
      rehypePlugins: [...rehypePlugins, [rehypeToc, { components: componentsByExport }]],
      ...opts,
    });

    const string = String(vfile)
      .replace(/await import\(_resolveDynamicMdxSpecifier\(('react'|"react")\)\)/, 'arguments[0].imports.React')
      .replace('"use strict";', '"use strict";\nconst { user } = arguments[0].imports;\n');
    return string;
  } catch (error) {
    throw error.line ? new MdxSyntaxError(error, text) : error;
  }
};

export default compile;
