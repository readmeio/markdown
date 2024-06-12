import debug from 'debug';

import { createProcessor } from '@mdx-js/mdx';

import * as Components from './components';
import { getHref } from './components/Anchor';
import { options } from './options';

import './styles/main.scss';

const unimplemented = debug('mdx:unimplemented');

const utils = {
  get options() {
    return { ...options };
  },

  getHref,
  calloutIcons: {},
};

export const reactProcessor = (opts = {}) => {
  return createProcessor({ remarkPlugins, ...opts });
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

export const esast = (text: string, opts = {}) => {
  unimplemented('esast export');
};

export { compile, hast, hastFromHtml, run, mdast, mdx, plain, remarkPlugins } from './lib';
export { Components, utils };
