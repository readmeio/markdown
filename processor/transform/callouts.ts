import type { Blockquote, Root } from 'mdast';
import type { Callout } from 'types';

import emojiRegex from 'emoji-regex';
import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

const calloutTransformer = () => {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote | Callout) => {
      if (!(node.children[0].type === 'paragraph' && node.children[0].children[0].type === 'text')) return;

      const startText = node.children[0].children[0].value;
      const [match, icon] = startText.match(regex) || [];

      if (icon && match) {
        const heading = startText.slice(match.length);
        const empty = !heading.length && node.children[0].children.length === 1;

        node.children[0].children[0].value = heading;

        Object.assign(node, {
          type: NodeTypes.callout,
          data: {
            hName: 'Callout',
            hProperties: {
              icon,
              empty,
            },
          },
        });
      }
    });
  };
};

export default calloutTransformer;
