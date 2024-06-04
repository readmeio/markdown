import { readmeComponentsTransformer } from '../processor/transform';
import astProcessor, { MdastOpts } from './ast-processor';

const mdast: any = (text: string, opts: MdastOpts = {}) => {
  const processor = astProcessor(opts).use(readmeComponentsTransformer({ components: opts.components }));

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export default mdast;
