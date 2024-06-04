import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const imageTransformer = () => {
  return (tree: any) => {
    visit(tree, 'image', (node, i, parent) => {
      // check if inline or already transformed
      if (parent.type !== 'paragraph' || parent.children.length > 1 || node.data?.hName === 'image') return;
      const newNode = {
        type: NodeTypes.image,
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
      parent.children[i] = newNode;
    });
  };
};

export default imageTransformer;