import type { MdastOpts } from './ast-processor';

import astProcessor from './ast-processor';

const mdast: any = (text: string, opts: MdastOpts = {}) => {
  const processor = astProcessor(opts);
  const tree = processor.parse(text);

  return processor.runSync(tree);
};

export default mdast;
