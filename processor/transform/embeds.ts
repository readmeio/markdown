import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const embedTransformer = () => {
  return (tree: any) => {
    visit(tree, 'link', (node, _, parent) => {
      if (parent.type !== 'paragraph' || parent.children.length > 1 || node.title !== '@embed') return;
      const newNode = {
        type: NodeTypes.embed,
        data: {
          hProperties: { title: node.children[0]?.value ?? node.url, url: node.url, provider: node.url },
          hName: 'Embed',
        },
        position: node.position,
        children: [],
      };
      parent = newNode;
    });
  };
};

export default embedTransformer;