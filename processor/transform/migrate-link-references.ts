import type { LinkReference, Parents, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const migrateLinkReferences: Plugin<[{ rdmd: { md: (node: LinkReference) => string } }], Root> = ({ rdmd }) => {

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
