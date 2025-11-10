import type { Root } from 'mdast';
import type { Plugin, Transformer } from 'unified';

import { visit } from 'unist-util-visit';

import { wrapHeading } from './callouts';

const migrateCallouts: Plugin<[], Root> = (): Transformer<Root> => (tree: Root) => {
  visit(tree, 'rdme-callout', callout => {
    const firstChild = callout.children?.[0];
    // This will retain the value of the node if it is not a paragraph, e.g. an HTML node
    if (firstChild && firstChild.type === 'paragraph') {
      callout.children[0] = wrapHeading(callout);
    }
  });

  return tree;
};

export default migrateCallouts;
