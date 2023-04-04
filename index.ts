import debug from 'debug';
import * as MDX from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { remark } from 'remark';
import remarkMdx, { Root } from 'remark-mdx';
import { VFile } from '@mdx-js/mdx/lib/compile';

/* eslint-disable no-param-reassign */
require('./styles/main.scss');

const unimplemented = debug('mdx:unimplemented');

export const react = async (text: string, opts = {}) => {
  const code = await compile(text, opts);
  const Tree = await run(code, opts);

  return Tree;
};

export const compile = async (text: string, opts = {}) => {
  const code = await MDX.compile(text, {
    outputFormat: 'function-body',
    development: false,
  });

  return code;
};

export const run = async (code: VFile | string, opts = {}) => {
  const { default: Tree } = await MDX.run(code, { ...runtime });
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
