import { visit } from 'unist-util-visit';
import { Node, Paragraph, Parents } from 'mdast';

import { NodeTypes } from '../../enums';
import { ImageBlock } from '../../types';

const imageTransformer = () => {
  return (tree: Node) => {
    visit(tree, 'paragraph', (node: Paragraph, i: number, parent: Parents) => {
      // check if inline or already transformed
      if (parent.type !== 'root' || node.children?.length > 1 || node.children[0].type !== 'image') return;
      const [{ alt, url, title }] = node.children as any;

      const newNode = {
        type: NodeTypes.imageBlock,
        alt,
        title,
        url,
        data: {
          hName: 'img',
          hProperties: { 
            ...(alt && { alt }),
            src: url,
            ...(title && { title }),
          },
        },
        position: node.position,
      } as ImageBlock;

      parent.children.splice(i, 1, newNode);
    });
  };
};

export default imageTransformer;