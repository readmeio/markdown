import debug from 'debug';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';

import { createProcessor, compileSync, runSync } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

import unified from 'unified';
import Variable from '@readme/variable';
import * as Components from './components';
import { getHref } from './components/Anchor';
import BaseUrlContext from './contexts/BaseUrl';
import { options } from './options';

require('./styles/main.scss');

const calloutTransformer = require('./processor/transform/callouts').default;

const unimplemented = debug('mdx:unimplemented');

const { GlossaryItem } = Components;

export { Components };

export const utils = {
  get options() {
    return { ...options };
  },

  BaseUrlContext,
  getHref,
  GlossaryContext: GlossaryItem.GlossaryContext,
  VariablesContext: Variable.VariablesContext,
  calloutIcons: {},
};

export const reactProcessor = (opts = {}) => {
  return createProcessor(opts);
};

export const react = (text: string, opts = {}) => {
  //const Mdx = (
  //<MDXRuntime components={{ 'rdme-callout': Components.Callout }} remarkPlugins={[calloutTransformer]}>
  //{text}
  //</MDXRuntime>
  //);
  //return <ErrorBoundary key={text}>{Mdx}</ErrorBoundary>;

  const code = compileSync(text, { outputFormat: 'function-body' });

  return code;
};

export const run = (code: string, opts = {}) => {
  const { default: Content } = runSync(code, { ...runtime, baseUrl: '' });
  return Content;
};

export const reactTOC = (text: string, opts = {}) => {
  unimplemented('reactTOC export');
};

export const mdx = (tree: any, opts = {}) => {
  return remark().use(remarkMdx).stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

export const mdast = (text: string, opts = {}) => {
  const processor = unified().use(remark).use(calloutTransformer);

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
