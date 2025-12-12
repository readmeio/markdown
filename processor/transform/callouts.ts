import type { Blockquote, Heading, Node, Paragraph, Parent, Root, Text } from 'mdast';
import type { Callout } from 'types';

import emojiRegex from 'emoji-regex';
import { visit } from 'unist-util-visit';

import { themes } from '../../components/Callout';
import { NodeTypes } from '../../enums';
import plain from '../../lib/plain';

import { extractText } from './extract-text';

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

const findFirst = (node: Node): Node | null => {
  if ('children' in node) return findFirst(node.children[0]);
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
      start: firstChild.position.start,
      end: firstChild.position.end,
    },
  };
};

/**
 * Checks if a blockquote matches the expected callout structure:
 * blockquote > paragraph > text node
 */
const isCalloutStructure = (node: Blockquote): boolean => {
  const firstChild = node.children?.[0];
  if (!firstChild || firstChild.type !== 'paragraph') return false;

  if (!('children' in firstChild)) return false;

  const firstTextChild = firstChild.children?.[0];
  return firstTextChild?.type === 'text';
};

const calloutTransformer = () => {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index: number | undefined, parent: Parent | undefined) => {
      if (!isCalloutStructure(node)) {
        // Replace blockquote with a paragraph containing its stringified content
        if (index !== undefined && parent) {
          const content = extractText(node) || '>';
          const textNode: Text = {
            type: 'text',
            value: content,
          };
          const paragraphNode: Paragraph = {
            type: 'paragraph',
            children: [textNode],
            position: node.position,
          };
          parent.children.splice(index, 1, paragraphNode);
        }
        return;
      }

      // @ts-expect-error -- @todo: update plain to accept mdast
      const startText = plain(node.children[0]).toString();
      const [match, icon] = startText.match(regex) || [];

      if (icon && match) {
        const heading = startText.slice(match.length);
        // @ts-expect-error - isCalloutStructure ensures node.children[0] is a paragraph with children
        const empty = !heading.length && node.children[0].children.length === 1;
        const theme = themes[icon] || 'default';

        const firstChild = findFirst(node.children[0]);
        if (firstChild && 'value' in firstChild && typeof firstChild.value === 'string') {
          firstChild.value = firstChild.value.slice(match.length);
        }

        if (heading) {
          node.children[0] = wrapHeading(node);
          // @note: We add to the offset/column the length of the unicode
          // character that was stripped off, so that the start position of the
          // heading/text matches where it actually starts.
          node.children[0].position.start.offset += match.length;
          node.children[0].position.start.column += match.length;
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
