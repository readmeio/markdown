import type { CompileOptions } from '@mdx-js/mdx';
import type { PluggableList } from 'unified';

import { compileSync as mdxCompileSync } from '@mdx-js/mdx';
import deepmerge from 'deepmerge';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import MdxSyntaxError from '../errors/mdx-syntax-error';
import rehypeStripDangerousHtml from '../processor/plugin/dangerous-html';
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
  hardBreaks?: boolean;
  missingComponents?: 'ignore' | 'throw';
  useTailwind?: boolean;
};

const sanitizeSchema = deepmerge(defaultSchema, {
  attributes: {
    a: ['target'],
  },
  protocols: {
    href: ['doc', 'ref', 'blog', 'changelog', 'page'],
  },
});

const compile = (
  text: string,
  {
    components = {},
    missingComponents,
    copyButtons,
    useTailwind,
    hardBreaks,
    // Pulled out of `...opts` so the sanitizer below is always appended last: a caller's
    // `rehypePlugins`/`remarkPlugins` must not replace the pipeline (and drop the stripper).
    remarkPlugins: userRemarkPlugins = [],
    rehypePlugins: userRehypePlugins = [],
    ...opts
  }: CompileOpts = {},
) => {
  // Destructure at runtime to avoid circular dependency issues
  const { codeTabsTransformer, ...transforms } = defaultTransforms;

  const remarkPlugins: PluggableList = [
    remarkFrontmatter,
    remarkGfm,
    ...(hardBreaks ? [remarkBreaks] : []),
    ...Object.values(transforms),
    [codeTabsTransformer, { copyButtons }],
    [
      handleMissingComponents,
      { components, missingComponents: ['ignore', 'throw'].includes(missingComponents) ? missingComponents : 'ignore' },
    ],
    [validateMCPIntro]
  ];

  if (useTailwind) {
    remarkPlugins.push([tailwindTransformer, { components }]);
  }

  remarkPlugins.push(...userRemarkPlugins);

  const rehypePlugins: PluggableList = [...defaultRehypePlugins, [rehypeToc, { components }], ...userRehypePlugins];

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
  } else {
    // MDX keeps raw HTML as JSX nodes the `rehypeSanitize` allow-list never sees, and
    // custom components must survive an allow-list anyway, so fall back to a deny-list.
    // Narrower guarantee than the `md` path — see `dangerous-html.ts`.
    rehypePlugins.push(rehypeStripDangerousHtml);
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
