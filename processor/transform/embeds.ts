import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';
import { Embed } from '../../types';

const embedTransformer = () => {
  return (tree: any) => {
    visit(tree, 'paragraph', (node, i, parent) => {
      const [{ url, title, children }] = node.children;
      if (title !== '@embed') return;

      const newNode = {
        type: NodeTypes.embed,
        title,
        label: children[0]?.value ?? '',
        data: {
          hProperties: {  
            url: url, 
            title: children[0]?.value ?? '',
          },
          hName: 'embed',
        },
        position: node.position,
      } as Embed;

      parent.children.splice(i, 1, newNode);
    });
  };
};

export default embedTransformer;