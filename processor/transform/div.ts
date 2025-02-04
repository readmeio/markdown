import type { TutorialTile } from '../../types';
import type { Node, Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const divTransformer = (): Transform => tree => {
  visit(tree, 'div', (node: Node, index, parent: Parent) => {
    const type = node.data?.hName;

    switch (type) {
      // Check if the div is a tutorial-tile in disguise
      case NodeTypes.tutorialTile:
        {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { hName, hProperties, ...rest } = node.data;
          const tile = {
            ...rest,
            type: NodeTypes.tutorialTile,
          } as TutorialTile;
          parent.children.splice(index, 1, tile);
        }
        break;
      // idk what this is and/or just make it a paragraph
      default:
        node.type = type || 'paragraph';
    }
  });

  return tree;
};

export default divTransformer;
