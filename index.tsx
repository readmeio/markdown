import debug from 'debug';
import React from 'react';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';

import { createProcessor, compileSync, run as mdxRun, RunOptions } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

import Variable from '@readme/variable';
import * as Components from './components';
import { getHref } from './components/Anchor';
import { GlossaryContext } from './components/GlossaryItem';
import BaseUrlContext from './contexts/BaseUrl';
import { options } from './options';

import transformers, { readmeComponentsTransformer } from './processor/transform';
import compilers from './processor/compile';
import MdxSyntaxError from './errors/mdx-syntax-error';

const unimplemented = debug('mdx:unimplemented');

type ComponentOpts = Record<string, (props: any) => React.ReactNode>;

type RunOpts = Omit<RunOptions, 'Fragment'> & {
  components?: ComponentOpts;
  imports?: Record<string, unknown>;
};

type MdastOpts = {
  components?: Record<string, string>;
};

export { Components };

export const utils = {
  get options() {
    return { ...options };
  },

  BaseUrlContext,
  getHref,
  GlossaryContext,
  VariablesContext: Variable.VariablesContext,
  calloutIcons: {},
};

const makeUseMDXComponents = (more: RunOpts['components']): (() => ComponentOpts) => {
  const components = {
    ...more,
    ...Components,
    Variable,
    code: Components.Code,
    'code-tabs': Components.CodeTabs,
    'html-block': Components.HTMLBlock,
    img: Components.Image,
    table: Components.Table,
  };

  return () => components;
};

const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers];

export const reactProcessor = (opts = {}) => {
  return createProcessor({ remarkPlugins, ...opts });
};

export const compile = (text: string, opts = {}) => {
  try {
    return String(
      compileSync(text, {
        outputFormat: 'function-body',
        providerImportSource: '#',
        remarkPlugins,
        ...opts,
      }),
    ).replace(/await import\(_resolveDynamicMdxSpecifier\('react'\)\)/, 'arguments[0].imports.React');
  } catch (error) {
    console.error(error);
    throw error.line ? new MdxSyntaxError(error, text) : error;
  }
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
  return remark().use(remarkMdx).use(remarkGfm).use(compilers).stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

const astProcessor = (opts: MdastOpts = { components: {} }) =>
  remark()
    .use(remarkMdx)
    .use(remarkFrontmatter)
    .use(remarkPlugins)
    .use(readmeComponentsTransformer({ components: opts.components }));

export const mdast: any = (text: string, opts: MdastOpts = {}) => {
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
