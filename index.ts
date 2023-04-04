import debug from 'debug';
import * as MDX from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { remark } from 'remark';
import remarkMdx, { Root } from 'remark-mdx';

/* eslint-disable no-param-reassign */
require('./styles/main.scss');

const unimplemented = debug('mdx:unimplemented');

export const react = async (text: string, opts = {}) => {
  const code = await MDX.compile(text, { development: false, outputFormat: 'function-body' });
  const Tree = await MDX.run(code, { ...runtime });

  return Tree;
};

export const reactToc = (text: string, opts = {}) => {
  unimplemented('reactToc export');
};

export const mdx = (tree: Root, opts = {}) => {
  return remark().use(remarkMdx).stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

export const mdast = (text: string, opts = {}) => {
  return remark().use(remarkMdx).parse(text);
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
