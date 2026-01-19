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

const processBlockquote = (
  node: Blockquote,
  index: number | undefined,
  parent: Parent | undefined,
) => {
  if (!isCalloutStructure(node)) {
    // Only stringify empty blockquotes (no extractable text content)
    // Preserve blockquotes with actual content (e.g., headings, lists, etc.)
    const content = extractText(node);
    const isEmpty = !content || content.trim() === '';

    if (isEmpty && index !== undefined && parent) {
      const textNode: Text = {
        type: 'text',
        value: '>',
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

  // isCalloutStructure ensures node.children[0] is a Paragraph with children
  const firstParagraph = node.children[0] as Paragraph;
  const startText = plain(firstParagraph as unknown as Parameters<typeof plain>[0]).toString();
  const [match, icon] = startText.match(regex) || [];

  if (icon && match) {
    const heading = startText.slice(match.length);
    const empty = !heading.length && firstParagraph.children.length === 1;
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
};

const calloutTransformer = () => {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index: number | undefined, parent: Parent | undefined) => {
      processBlockquote(node, index, parent);
    });
  };
};

export default calloutTransformer;
