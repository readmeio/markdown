import type { LinkReference, Parents, Root } from 'mdast';
import type { Plugin } from 'unified';

// eslint-disable-next-line import/no-extraneous-dependencies
import * as rdmd from '@readme/markdown-legacy';
import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const migrateLinkReferences: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'linkReference', (node: LinkReference, index: number, parent: Parents) => {
      if (!('children' in parent)) return;

      parent.children.splice(index, 1, {
        type: NodeTypes.plain,
        value: rdmd.md(node).trim(),
      });
    });
  };
};

export default migrateLinkReferences;
