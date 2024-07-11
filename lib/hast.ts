import astProcessor, { rehypePlugins, MdastOpts } from './ast-processor';
import remarkRehype from 'remark-rehype';
import { injectComponents } from '../processor/transform';
import { MdastComponents } from '../types';
import mdast from './mdast';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';

const hast = (text: string, opts: MdastOpts = {}) => {
  const components: MdastComponents = Object.entries(opts.components || {}).reduce((memo, [name, doc]) => {
    memo[name] = mdast(doc);
    return memo;
  }, {});

  const processor = astProcessor(opts).use(injectComponents({ components })).use(remarkRehype).use(rehypePlugins);

  return processor.runSync(processor.parse(text));
};

export const hastFromHtml = (html: string) => {
  return unified().use(rehypeParse).parse(html);
};

export default hast;
