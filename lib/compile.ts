import type { CompileOptions } from '@mdx-js/mdx';
import type { PluggableList } from 'unified';

import { compileSync as mdxCompileSync } from '@mdx-js/mdx';
import deepmerge from 'deepmerge';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import MdxSyntaxError from '../errors/mdx-syntax-error';
import { rehypeToc } from '../processor/plugin/toc';
import {
  defaultTransforms,
  tailwindTransformer,
  handleMissingComponents,
  validateMCPIntro,
} from '../processor/transform';

import { rehypePlugins as defaultRehypePlugins } from './ast-processor';

export type CompileOpts = CompileOptions & {
  components?: Record<string, string>;
  copyButtons?: boolean;
  missingComponents?: 'ignore' | 'throw';
  useTailwind?: boolean;
};

const sanitizeSchema = deepmerge(defaultSchema, {
  protocols: ['doc', 'ref', 'blog', 'changelog', 'page'],
});

const compile = (
  text: string,
  { components = {}, missingComponents, copyButtons, useTailwind, ...opts }: CompileOpts = {},
) => {
  // Destructure at runtime to avoid circular dependency issues
  const { codeTabsTransformer, ...transforms } = defaultTransforms;

  const remarkPlugins: PluggableList = [
    remarkFrontmatter,
    remarkGfm,
    ...Object.values(transforms),
    [codeTabsTransformer, { copyButtons }],
    [
      handleMissingComponents,
      { components, missingComponents: ['ignore', 'throw'].includes(missingComponents) ? missingComponents : 'ignore' },
    ],
    [validateMCPIntro],
  ];

  if (useTailwind) {
    remarkPlugins.push([tailwindTransformer, { components }]);
  }

  const rehypePlugins: PluggableList = [...defaultRehypePlugins, [rehypeToc, { components }]];

  if (opts.format === 'md') {
    /**
     * When running in `md` format we need to sanitize the content for security reasons.
     * The `mdxCompileSync` has a very aggressive sanitization process that removes
     * all HTML elements. The `mdx` internal rendering pipeline processess the plugins
     * before it's internal sanitization, so parse the raw tree first,
     * then sanitize it to remove any disallowed attributes. This circumvents the
     * default sanitization.
     */
    rehypePlugins.push([
      rehypeRaw,
      {
        passThrough: ['mdxjsEsm'],
      },
    ]);
    rehypePlugins.push([rehypeSanitize, sanitizeSchema]);
  }

  try {
    const vfile = mdxCompileSync(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins,
      rehypePlugins,
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
