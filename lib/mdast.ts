import type { MdastOpts } from './ast-processor';
import type { Root } from 'mdast';

import astProcessor from './ast-processor';

const mdast = (text: string, opts: MdastOpts = {}): Root => {
  const processor = astProcessor(opts);
  const tree = processor.parse(text);

  return processor.runSync(tree);
};

export default mdast;
