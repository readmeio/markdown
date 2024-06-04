import { NodeTypes } from '../../enums';
import { Transform } from 'mdast-util-from-markdown';
import { MdxJsxAttribute } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

const readmeToMdx = (): Transform => tree => {
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
