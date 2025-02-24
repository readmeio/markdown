import type { MdastOpts } from './ast-processor';
import type { MdastComponents } from '../types';

import remarkRehype from 'remark-rehype';

import { injectComponents, mdxToHast } from '../processor/transform';

import astProcessor, { rehypePlugins } from './ast-processor';
import mdast from './mdast';

const hast = (text: string, opts: MdastOpts = {}) => {
  const components: MdastComponents = Object.entries(opts.components || {}).reduce((memo, [name, doc]) => {
    memo[name] = mdast(doc);
    return memo;
  }, {});

  const processor = astProcessor(opts)
    .use(injectComponents({ components }))
    .use(mdxToHast)
    .use(remarkRehype)
    .use(rehypePlugins);

  return processor.runSync(processor.parse(text));
};
export default hast;
