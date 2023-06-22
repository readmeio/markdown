import React from 'react';
import debug from 'debug';
import * as runtime from 'react/jsx-runtime';
import { remark } from 'remark';
import remarkMdx, { Root } from 'remark-mdx';
import { VFile } from 'vfile';
import * as CustomParsers from "./processor/parse/index.js";

/* eslint-disable no-param-reassign */
require('./styles/main.scss');

const MDX = require('@mdx-js/mdx');
const MDXRuntime = require('@mdx-js/runtime');
import {renderToString} from 'react-dom/server'


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

export const processor = (opts = {}) => {
  return MDX.createCompiler(opts).use(CustomParsers);
};

export const reactProcessor = (opts = {}) => {
  return MDX.createCompiler(opts).use(CustomParsers);
};

// export const reactProcessor = (opts = {}) => {
//   unimplemented('reactProcessor export');
// };

// export const react = (text: string, opts = {}) => {
//   const code = compile(text, opts);
//   const Tree = run(code, opts);

//   return Tree;
// };

export const react = (text: string, opts = {}) => {
  return () => (
    <MDXRuntime>
      {text}
    </MDXRuntime> 
  )
};

// export const compile = (text: string, opts = {}): string => {
//   try {
//     const code = MDX.sync(text, {
//       outputFormat: 'function-body',
//       development: false,
//     });
//     console.log('code', code)

//     return code;
//   } catch (e) {
//     console.log('compile', e);
//     return '';
//   }
// };

// export const run = (code: string | string, opts = {}) => {
//   try {
//     const { default: Tree } = MDX.sync(code, { ...runtime });
//     const { default: Tree } = MDX.createCompiler().run(code)
//     console.log('Tree', Tree)
//     return Tree;
//   } catch (e) {
//     console.log('run', e)
//     return null;
//   }
// };

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

const ReadMeMarkdown = (text: string, opts = {}) => react(text, opts);

export default ReadMeMarkdown;
