import { Parent } from 'mdast';
import { NodeTypes } from '../../enums';
import { Transform } from 'mdast-util-from-markdown';
import { MdxJsxAttribute } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

const readmeToMdx = (): Transform => tree => {
  // Unwrap pinned nodes, replace rdme-pin with its child node
  visit(tree, 'rdme-pin', (node: Parent, i, parent) => {
    const newNode = node.children[0];
    parent.children.splice(i, 1, newNode);
  });

  visit(tree, NodeTypes.tutorialTile, (tile, index, parent) => {
    const attributes: MdxJsxAttribute[] = ['backgroundColor', 'emoji', 'id', 'link', 'slug', 'title'].map(name => {
      const value = tile[name];
      delete tile[name];

      return {
        type: 'mdxJsxAttribute',
        name,
        value,
      };
    });

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'TutorialTile',
      attributes,
      children: [],
    });
  });

  return tree;
};

export default readmeToMdx;
