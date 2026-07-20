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
  FLOW_TYPES,
  hast,
  htmlToMarkdown,
  INLINE_ONLY_PARENT_TYPES,
  run,
  mdast,
  mdastV6,
  mdx,
  mdxish,
  mdxishAstProcessor,
  mdxishMdastToMd,
  mdxishTags,
  extractToc,
  migrate,
  mix,
  plain,
  renderMdxish,
  remarkPlugins,
  stripComments,
  tags,
} from './lib';
export type { MdxishOpts, RenderMdxishOpts, RunOpts } from './lib';
export { default as Owlmoji } from './lib/owlmoji';
export { Components, utils };
export { tailwindCompiler } from './utils/tailwind-compiler';
export { regex as gemojiRegex } from './processor/transform/gemoji+';
export { NodeTypes } from './enums';
