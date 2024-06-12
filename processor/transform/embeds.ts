import { visit } from 'unist-util-visit';
import { Paragraph, Parents, Node } from 'mdast';

import { NodeTypes } from '../../enums';
import { EmbedBlock } from '../../types';

const embedTransformer = () => {
  return (tree: Node) => {
    visit(tree, 'paragraph', (node: Paragraph, i: number, parent: Parents) => {
      const [{ url, title, children = [] }] = node.children as any;

      if (title !== '@embed') return;
      const newNode = {
        type: NodeTypes.embedBlock,
        label: children[0]?.value,
        title,
        url,
        data: {
          hProperties: {  
            url, 
            title: children[0]?.value ?? title,
          },
          hName: 'embed',
        },
        position: node.position,
      } as EmbedBlock;

      parent.children.splice(i, 1, newNode);
    });
  };
};

export default embedTransformer;