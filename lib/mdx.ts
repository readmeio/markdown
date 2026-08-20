import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { PluggableList } from 'unified';
import type { VFile } from 'vfile';

import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import compilers from '../processor/compile';
import { compatabilityTransfomer, divTransformer, readmeToMdx, tablesToJsx } from '../processor/transform';
import { escapePipesInTables } from '../processor/transform/escape-pipes-in-tables';

interface Opts {
  file?: VFile | string;
  hast?: boolean;
  remarkTransformers?: PluggableList;
}

export const mdx = (
  tree: HastRoot | MdastRoot,
  { hast = false, remarkTransformers = [], file, ...opts }: Opts = {},
) => {
  const processor = unified()
    .use(hast ? rehypeRemark : undefined)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkTransformers)
    .use(divTransformer)
    .use(readmeToMdx)
    .use(tablesToJsx)
    .use(compatabilityTransfomer)
    .use(escapePipesInTables)
    .use(compilers)
    .use(remarkStringify, opts);

  // @ts-expect-error - @todo: coerce the processor and tree to the correct
  // type depending on the value of hast
  const string = processor.stringify(processor.runSync(tree, file));

  // @note: mdast-util-mdx-jsx's containerFlow function inserts `\n\n` between
  // all children of flow JSX elements. For table elements this introduces blank
  // lines between siblings (e.g. </th>\n\n<th>, </thead>\n\n<tbody>) which the
  // MDX renderer treats as new AST nodes, breaking table structure. Collapse
  // these to single newlines while preserving blank lines inside cell content.
  return string.replace(
    /(<\/(?:th|td|tr|thead|tbody)>)\n\n(\s*<(?:th|td|tr|thead|tbody)[\s>])/g,
    '$1\n$2',
  );
};

export default mdx;
