import { Root } from 'mdast';
import { visit } from 'unist-util-visit';

const types = {
  CodeTabs: 'code-tabs',
  Image: 'image',
  Table: 'table',
};

const readmeComponents =
  ({ components, readmeComponents }) =>
  (tree: Root) => {
    visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
      if (node.name in readmeComponents) {
        const newNode = {
          type: types[node.name],
        };

        parent.children[index] = newNode;
      }
    });

    return tree;
  };

export default readmeComponents;
