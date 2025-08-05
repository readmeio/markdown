import type { Blockquote, Heading, Node, Root } from 'mdast';
import type { Callout } from 'types';

import emojiRegex from 'emoji-regex';
import { visit } from 'unist-util-visit';

import { themes } from '../../components/Callout';
import { NodeTypes } from '../../enums';
import plain from '../../lib/plain';

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

const findFirst = (node: Node): Node | null => {
  if ('children' in node) return findFirst(node.children[0]);
  if (node.type === 'text') return node;
  return null;
};

const findLast = (node: Node): Node | null => {
  if ('children' in node && Array.isArray(node.children)) return findFirst(node.children[node.children.length - 1]);
  if (node.type === 'text') return node;
  return null;
};

export const wrapHeading = (node: Blockquote | Callout): Heading => {
  const firstChild = node.children[0];

  return {
    type: 'heading' as Heading['type'],
    depth: 3,
    children: ('children' in firstChild ? firstChild.children : []) as Heading['children'],
    position: {
      start: findFirst(firstChild)?.position.start,
      end: findLast(firstChild)?.position.end,
    },
  };
};

const calloutTransformer = () => {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      if (!(node.children[0].type === 'paragraph' && node.children[0].children[0].type === 'text')) return;

      // @ts-expect-error -- @todo: update plain to accept mdast
      const startText = plain(node.children[0]).toString();
      const [match, icon] = startText.match(regex) || [];

      if (icon && match) {
        const heading = startText.slice(match.length);
        const empty = !heading.length && node.children[0].children.length === 1;
        const theme = themes[icon] || 'default';

        const firstChild = findFirst(node.children[0]);
        if (firstChild && 'value' in firstChild && typeof firstChild.value === 'string') {
          firstChild.value = firstChild.value.slice(match.length);
        }

        if (heading) {
          node.children[0] = wrapHeading(node);
        }

        Object.assign(node, {
          type: NodeTypes.callout,
          data: {
            hName: 'Callout',
            hProperties: {
              icon,
              ...(empty && { empty }),
              theme,
            },
          },
        });
      }
    });
  };
};

export default calloutTransformer;
