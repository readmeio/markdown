import React from 'react';
import debug from 'debug';
import { remark } from 'remark';
import remarkMdx, { Root } from 'remark-mdx';
import remarkParse from 'remark-parse';

import ErrorBoundary from './lib/ErrorBoundary';

require('./styles/main.scss');

const MDX = require('@mdx-js/mdx');
const MDXRuntime = require('@mdx-js/runtime').default;

const unified = require('unified');
const Variable = require('@readme/variable');
const Components = require('./components');
const { getHref } = require('./components/Anchor');
const BaseUrlContext = require('./contexts/BaseUrl');
const { options } = require('./options');
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
  return MDX.createCompiler(opts);
};

export const react = (text: string, opts = {}) => {
  const Mdx = <MDXRuntime components={{'rdme-callout': Components.Callout}} remarkPlugins={[calloutTransformer]}>{text}</MDXRuntime>
  return (
   <ErrorBoundary key={text}>
      {Mdx}
   </ErrorBoundary>
  )
};

export const reactTOC = (text: string, opts = {}) => {
  unimplemented('reactTOC export');
};

export const mdx = (tree: Root, opts = {}) => {
  return remark().use(remarkMdx).stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

export const mdast = (text: string, opts = {}) => {
  const processor = unified().use(remarkParse).use(calloutTransformer);

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

const ReadMeMarkdown = (text: string, opts = {}) => react(text, opts);

export default ReadMeMarkdown;
