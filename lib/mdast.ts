import astProcessor, { MdastOpts } from './ast-processor';

const mdast: any = (text: string, opts: MdastOpts = {}) => {
  const processor = astProcessor(opts);
  const tree = processor.parse(text);

  return processor.runSync(tree);
};

export default mdast;
