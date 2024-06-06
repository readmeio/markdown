import debug from 'debug';
import remarkRehype from 'remark-rehype';

import { createProcessor } from '@mdx-js/mdx';

import * as Components from './components';
import { getHref } from './components/Anchor';
import { options } from './options';

import { readmeComponentsTransformer } from './processor/transform';
import { compile, run, mdx, astProcessor, remarkPlugins } from './lib';

import './styles/main.scss';

const unimplemented = debug('mdx:unimplemented');

type MdastOpts = {
  components?: Record<string, string>;
};

const utils = {
  get options() {
    return { ...options };
  },

  getHref,
  calloutIcons: {},
};

export { compile, run, mdx, Components, utils };

export const reactProcessor = (opts = {}) => {
  return createProcessor({ remarkPlugins, ...opts });
};

export const mdast: any = (text: string, opts: MdastOpts = {}) => {
  const processor = astProcessor(opts).use(readmeComponentsTransformer({ components: opts.components }));

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export const hast = (text: string, opts = {}) => {
  const processor = astProcessor(opts).use(remarkRehype);

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export const plain = (text: string, opts = {}) => {
  unimplemented('plain export');
};
