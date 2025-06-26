import type { TutorialTile } from '../../types';
import type { Node, Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

// This transformer has been necessary for migrating legacy markdown files 
// where tutorial tiles were wrapped in a div. It also provides a fallback for legacy magic blocks that were never fully supported:
//     [block:custom-block]
//     { ... }
//     [/block]
// This transformer runs before the readme-to-mdx transformer which reshapes the tutorial tile node
// to the Recipe component
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
