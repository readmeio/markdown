import type { $TSFixMe } from '@readme/iso';

import visit from 'unist-util-visit';

const tableTransfomer = () => (tree: $TSFixMe) => {
  visit(tree, 'table', table => {
    // @ts-expect-error: versioning issue, `visit` is stuck on and old version
    // with out of date mdast types
    // eslint-disable-next-line no-param-reassign
    table.align = table.align.map(align => (align === null ? 'center' : align));
  });

  return tree;
};

export default tableTransfomer;
