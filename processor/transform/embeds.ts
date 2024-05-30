import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';
import { Embed } from '../../types';

const embedTransformer = () => {
  return (tree: any) => {
    visit(tree, 'link', (node, i, parent) => {

      if (node.title !== '@embed') return;
      
      const newNode = {
        type: NodeTypes.embed,
        data: {
          hProperties: {  
            url: node.url, 
            title: node.title,
          },
          hName: 'embed',
        },
        position: node.position,
      } as Embed;

      parent = newNode;
    });
  };
};

export default embedTransformer;