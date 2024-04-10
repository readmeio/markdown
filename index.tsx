import debug from 'debug';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';

import { createProcessor, compileSync, run as mdxRun, RunOptions } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

import Variable from '@readme/variable';
import * as Components from './components';
import { getHref } from './components/Anchor';
import BaseUrlContext from './contexts/BaseUrl';
import { options } from './options';

require('./styles/main.scss');

import calloutTransformer from './processor/transform/callouts';
import react from 'react';

const unimplemented = debug('mdx:unimplemented');

type RunOpts = Omit<RunOptions, 'Fragment'> & {
  components?: Record<string, React.Component>;
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
  const components = { ...Components, ...more };

  return () => components;
};

export const reactProcessor = (opts = {}) => {
  return createProcessor({ remarkPlugins: [calloutTransformer], ...opts });
};

export const compile = (text: string, opts = {}) => {
  return String(
    compileSync(text, {
      outputFormat: 'function-body',
      providerImportSource: '#',
      remarkPlugins: [calloutTransformer],
      ...opts,
    }),
  );
};

export const run = async (code: string, _opts: RunOpts = {}) => {
  const { Fragment } = runtime as any;
  const { components, ...opts } = _opts;

  const file = await mdxRun(code, {
    ...runtime,
    Fragment,
    baseUrl: '',
    useMDXComponents: makeUseMDXComponents(components),
    ...opts,
  });

  return file?.default || (() => null);
};

export const reactTOC = (text: string, opts = {}) => {
  unimplemented('reactTOC');
};

export const mdx = (tree: any, opts = {}) => {
  return remark().use(remarkMdx).stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

export const mdast = (text: string, opts = {}) => {
  const processor = remark().use(remarkMdx);

  try {
    const tree = processor.parse(text);
    return processor.runSync(tree);
  } catch (e) {
    return { type: 'root', children: [] };
  }
};

export const hast = (text: string, opts = {}) => {
  unimplemented('hast export');
};

export const esast = (text: string, opts = {}) => {
  unimplemented('esast export');
};

export const plain = (text: string, opts = {}) => {
  unimplemented('plain export');
};
