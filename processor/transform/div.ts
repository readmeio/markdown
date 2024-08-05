import { NodeTypes } from '../../enums';
import { Node, Parent } from 'mdast';
import { Transform } from 'mdast-util-from-markdown';
import { TutorialTile } from '../../types';

import { visit } from 'unist-util-visit';

const divTransformer = (): Transform => tree => {
  visit(tree, 'div', (node: Node, index, parent: Parent) => {
    const type = node.data?.hName;
    switch (type) {
      // Check if the div is a tutorial-tile in disguise
      case NodeTypes.tutorialTile:
        const { hName, hProperties, ...rest } = node.data;
        const tile = {
          ...rest,
          type: NodeTypes.tutorialTile,
        } as TutorialTile;
        parent.children.splice(index, 1, tile);
      // idk what this is and/or just make it a paragraph
      default:
        node.type = type || 'paragraph';
    }
  });

  return tree;
};

export default divTransformer;
