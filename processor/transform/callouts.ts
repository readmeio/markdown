import { visit } from 'unist-util-visit';
import emojiRegex from 'emoji-regex';
import { Blockquote } from 'mdast';
import { Callout } from 'types';
import { NodeTypes } from '../../enums';

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

const calloutTransformer = () => {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: Blockquote | Callout) => {
      try {
        if (!(node.children[0].type === 'paragraph' && node.children[0].children[0].type === 'text')) return;
        const startText = node.children[0].children[0].value;
        const [match, icon] = startText.match(regex) || [];

        if (icon && match) {
          const heading = startText.slice(match.length);

          node.children.shift();
          node.type = NodeTypes.callout;
          node.data = {
            hName: 'Callout',
            hProperties: {
              heading,
              icon,
            },
          };
        }
      } catch (e) {
        console.log(e);
      }
    });
  };
};

export default calloutTransformer;
