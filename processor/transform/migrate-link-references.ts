import type { LinkReference, Parents, Root } from 'mdast';
import type { Plain } from 'types';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { visit } from 'unist-util-visit';

const migrateLinkReferences: Plugin<[], Root> = () => {
  return (tree: Root, vfile: VFile) => {
    visit(tree, 'linkReference', (node: LinkReference, index: number, parent: Parents) => {
      if (!('children' in parent)) return;

      parent.children.splice(index, 1, {
        type: 'plain',
        value: String(vfile).slice(node.position.start.offset, node.position.end.offset),
      } as Plain);
    });
  };
};

export default migrateLinkReferences;
