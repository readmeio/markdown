import debug from 'debug';
import * as runtime from 'react/jsx-runtime';
import { remark } from 'remark';
import remarkMdx, { Root } from 'remark-mdx';
import { VFile } from 'vfile';

/* eslint-disable no-param-reassign */
require('./styles/main.scss');

const MDX = require('@mdx-js/mdx');
const Variable = require('@readme/variable');
const Components = require('./components');
const { getHref } = require('./components/Anchor');
const BaseUrlContext = require('./contexts/BaseUrl');
const { options } = require('./options');
const { icons: calloutIcons } = require('./processor/parse/flavored/callout');

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
  calloutIcons,
};

export const react = (text: string, opts = {}) => {
  const code = compile(text, opts);
  const Tree = run(code, opts);

  return Tree;
};

export const compile = (text: string, opts = {}): VFile => {
  try {
    const code = MDX.compileSync(text, {
      outputFormat: 'function-body',
      development: false,
    });

    return code;
  } catch (e) {
    return new VFile();
  }
};

export const run = (code: VFile | string, opts = {}) => {
  try {
    const { default: Tree } = MDX.runSync(code, { ...runtime });
    return Tree;
  } catch (e) {
    return null;
  }
};

export const reactTOC = (text: string, opts = {}) => {
  unimplemented('reactTOC export');
};

export const reactProcessor = (text: string, opts = {}) => {
  unimplemented('reactProcessor export');
};

export const mdx = (tree: Root, opts = {}) => {
  return remark().use(remarkMdx).stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

export const mdast = (text: string, opts = {}) => {
  try {
    return remark().use(remarkMdx).parse(text);
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

export default react;
