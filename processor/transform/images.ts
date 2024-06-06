import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const imageTransformer = () => {
  return (tree: any) => {
    visit(tree, 'image', (node, _, parent) => {
      // check if inline or already transformed
      if (parent.type !== 'paragraph' || parent.children.length > 1 || node.data?.hName === 'image') return;
      const newNode = {
        type: NodeTypes.image,
        url: node.url,
        data: {
          hProperties: { 
            title: node.title,
            src: node.url,
            alt: node.alt,
            align: node.align,
            border: node.border,
            width: node.width,
            caption: node.caption,
            lazy: node.lazy, 
          },
          hName: 'image',
        },
        position: node.position,
      };
      parent = newNode;
    });
  };
};

export default imageTransformer;