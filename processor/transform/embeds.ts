import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const embedTransformer = () => {
  return (tree: any) => {
    visit(tree, 'link', (node, _, parent) => {
      if (parent.type !== 'paragraph' || parent.children.length > 1 || node.title !== '@embed') return node;
      try {
        const { children, url } = node;
        const title = children[0].value;
        node.type = NodeTypes.embed;
        node.data = {
          hProperties: { title, url, provider: url },
          hName: 'Embed',
        };
        node.children.shift();
      } catch (e) {
        console.log(e);
      }
    });
  };
};

export default embedTransformer;