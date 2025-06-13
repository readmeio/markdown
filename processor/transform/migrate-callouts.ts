import type { Root } from 'mdast';

import { visit } from 'unist-util-visit';

import { wrapHeading } from './callouts';

const migrateCallouts = () => (tree: Root) => {
  visit(tree, 'rdme-callout', callout => {
    callout.children[0] = wrapHeading(callout);
  });

  return tree;
};

export default migrateCallouts;
