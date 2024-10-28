import * as rdmd from '@readme/markdown-legacy';

const migrationNormalize = doc => {
  return doc.replaceAll(/^(<!--.*?)\\-->$/gms, '$1-->');
};

const mdastV6: any = (doc: string, opts: MdastOpts = {}) => {
  const [_normalizedDoc] = rdmd.setup(doc);
  const normalizedDoc = migrationNormalize(_normalizedDoc);

  const proc = rdmd
    .processor()
    .use(compatability)
    .use(emphasisTransfomer)
    .use(linkReferenceTransformer)
    .use(imageTransformer);

  const tree = proc.parse(normalizedDoc);
  proc.runSync(tree, normalizedDoc);

  return tree;
};

export default mdastV6;
