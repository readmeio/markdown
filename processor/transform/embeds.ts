import type { Embed, EmbedBlock } from '../../types';
import type { Paragraph, Parents, Node, Text } from 'mdast';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const isEmbed = (node: Node): node is Embed => 'title' in node && node.title === '@embed';

const embedTransformer = () => {
  return (tree: Node) => {
    visit(tree, 'paragraph', (node: Paragraph, i: number, parent: Parents) => {
      const [child] = node.children;
      if (!isEmbed(child)) return;

      const { url, title } = child;
      const label = (child.children[0] as Text).value;

      const newNode = {
        type: NodeTypes.embedBlock,
        label,
        title,
        url,
        data: {
          hProperties: {
            url,
            title: label ?? title,
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
