import astProcessor from './ast-processor';
import remarkRehype from 'remark-rehype';
import { injectComponents } from '../processor/transform';
import { MdastComponents } from '../types';
import mdast from './mdast';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';

interface Options {
  components?: Record<string, string>;
}

const hast = (text: string, opts: Options = {}) => {
  const components: MdastComponents = Object.entries(opts.components || {}).reduce((memo, [name, doc]) => {
    memo[name] = mdast(doc);
    return memo;
  }, {});

  const processor = astProcessor(opts).use(injectComponents({ components })).use(remarkRehype);

  return processor.runSync(processor.parse(text));
};

export const hastFromHtml = (html: string) => {
  return unified().use(rehypeParse).parse(html);
};

export default hast;
