import type { LinkReference, Parents, Root } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const migrateLinkReferences: Plugin<[], Root> = () => {
  return (tree: Root, vfile: VFile) => {
    visit(tree, 'linkReference', (node: LinkReference, index: number, parent: Parents) => {
      if (!('children' in parent)) return;

      parent.children.splice(index, 1, {
        type: NodeTypes.plain,
        value: String(vfile).slice(node.position.start.offset, node.position.end.offset),
      });
    });
  };
};

export default migrateLinkReferences;
