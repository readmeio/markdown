import * as rdmd from '@readme/markdown-legacy';
import migrationTransformers from '../processor/migration';

const migrationNormalize = (doc: string) => {
  return doc.replaceAll(/^(<!--.*?)\\-->$/gms, '$1-->');
};

const mdastV6: any = (doc: string) => {
  const [_normalizedDoc] = rdmd.setup(doc);
  const normalizedDoc = migrationNormalize(_normalizedDoc);

  const proc = rdmd.processor().use(migrationTransformers);

  const tree = proc.parse(normalizedDoc);
  proc.runSync(tree, normalizedDoc);

  return tree;
};

export default mdastV6;
