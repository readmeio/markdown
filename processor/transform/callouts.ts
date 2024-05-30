import { visit } from 'unist-util-visit';
import emojiRegex from 'emoji-regex';
import { Blockquote } from 'mdast';
import { NodeTypes } from '../../enums';
import { Callout } from 'types';

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

const calloutTransformer = () => {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: Blockquote | Callout) => {
      if (!(node.children[0].type === 'paragraph' && node.children[0].children[0].type === 'text')) return;

      const startText = node.children[0].children[0].value;
      const [match, icon] = startText.match(regex) || [];

      if (icon && match) {
        const heading = startText.slice(match.length);
        node.children[0].children[0].value = heading;

        Object.assign(node, {
          type: NodeTypes.callout,
          data: {
            hName: 'Callout',
            hProperties: {
              icon,
              empty: !heading.length,
            },
          },
        });

        console.log(JSON.stringify({ node }, null, 2));
      }
    });
  };
};

export default calloutTransformer;
