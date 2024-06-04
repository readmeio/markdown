import astProcessor from './ast-processor';
import remarkRehype from 'remark-rehype';

const hast = (text: string, opts = {}) => {
  const processor = astProcessor(opts).use(remarkRehype);

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export default hast;
