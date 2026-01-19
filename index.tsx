import * as Components from './components';
import { getHref } from './components/Anchor';
import { options } from './options';
import './styles/main.scss';

const utils = {
  get options() {
    return { ...options };
  },

  getHref,
  calloutIcons: {},
};

export {
  compile,
  exports,
  hast,
  run,
  mdast,
  mdastV6,
  mdx,
  mdxish,
  mdxishAstProcessor,
  mdxishMdastToMd,
  mdxishTags,
  migrate,
  mix,
  plain,
  renderMdxish,
  remarkPlugins,
  stripComments,
  tags,
  isPlainText,
} from './lib';
export { default as Owlmoji } from './lib/owlmoji';
export { Components, utils };
export { tailwindCompiler } from './utils/tailwind-compiler';
export { regex as gemojiRegex } from './processor/transform/gemoji+';
