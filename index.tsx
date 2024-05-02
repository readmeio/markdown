import debug from 'debug';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import React from 'react';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';

import { createProcessor, compileSync, run as mdxRun, RunOptions } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

import Variable from '@readme/variable';
import * as Components from './components';
import { getHref } from './components/Anchor';
import BaseUrlContext from './contexts/BaseUrl';
import { options } from './options';

require('./styles/main.scss');

import calloutTransformer from './processor/transform/callouts';
import codeTabsTransfromer from './processor/transform/code-tabs';
import gemojiTransformer from './processor/transform/gemoji+';
import gemojiCompiler from './processor/compile/gemoji';

const unimplemented = debug('mdx:unimplemented');

type RunOpts = Omit<RunOptions, 'Fragment'> & {
  components?: Record<string, () => React.ReactNode>;
  imports?: Record<string, unknown>;
};

export { Components };

export const utils = {
  get options() {
    return { ...options };
  },

  BaseUrlContext,
  getHref,
  GlossaryContext: Components.GlossaryItem.GlossaryContext,
  VariablesContext: Variable.VariablesContext,
  calloutIcons: {},
};

const makeUseMDXComponents = (more: RunOpts['components']) => {
  const components = { ...more, ...Components, Variable, 'code-tabs': Components.CodeTabs };

  return () => components;
};

const remarkPlugins = [remarkFrontmatter, remarkGfm, calloutTransformer, gemojiTransformer, codeTabsTransfromer];

export const reactProcessor = (opts = {}) => {
  return createProcessor({ remarkPlugins, ...opts });
};

export const compile = (text: string, opts = {}) => {
  return String(
    compileSync(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins,
      ...opts,
    }),
  ).replace(/await import\(_resolveDynamicMdxSpecifier\('react'\)\)/, 'arguments[0].imports.React');
};

export const run = async (code: string, _opts: RunOpts = {}) => {
  const { Fragment } = runtime as any;
  const { components, ...opts } = _opts;

  const file = await mdxRun(code, {
    ...runtime,
    Fragment,
    baseUrl: import.meta.url,
    imports: { React },
    useMDXComponents: makeUseMDXComponents(components),
    ...opts,
  });

  return file?.default || (() => null);
};

export const reactTOC = (text: string, opts = {}) => {
  unimplemented('reactTOC');
};

export const mdx = (tree: any, opts = {}) => {
  return remark()
    .use(remarkMdx)
    .data({ toMarkdownExtensions: [{ extensions: [gemojiCompiler] }] })
    .stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

const astProcessor = (opts = {}) => remark().use(remarkMdx).use(remarkFrontmatter).use(remarkPlugins);

export const mdast: any = (text: string, opts = {}) => {
  const processor = astProcessor(opts);

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export const hast = (text: string, opts = {}) => {
  const processor = astProcessor(opts).use(remarkRehype);

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export const esast = (text: string, opts = {}) => {
  unimplemented('esast export');
};

export const plain = (text: string, opts = {}) => {
  unimplemented('plain export');
};
