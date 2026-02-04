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

const splitBodyFromHeading = (firstParagraph: Paragraph) => {
  const bodyChildren: Paragraph['children'] = [];
  let didSplit = false;

  for (let i = 0; i < firstParagraph.children.length; i += 1) {
    const child = firstParagraph.children[i];
    // eslint-disable-next-line no-continue
    if (child.type !== 'text' || typeof child.value !== 'string') continue;
    const newlineIndex = child.value.indexOf('\n');
    // eslint-disable-next-line no-continue
    if (newlineIndex === -1) continue;

    // Split the text node at the newline: content before becomes heading,
    // content after becomes body
    const before = child.value.slice(0, newlineIndex);
    const after = child.value.slice(newlineIndex + 1);
    // Collect all children before the split point as heading children
    const headingChildren = firstParagraph.children.slice(0, i);

    // Add the "before" text to heading if it has content, or if there are
    // no heading children yet (ensures we always have at least one child)
    if (before.length > 0 || headingChildren.length === 0) {
      headingChildren.push({ type: 'text', value: before });
    }

    // Build body children: start with text after newline (if any),
    // then include all remaining children from the original paragraph
    if (after.length > 0) {
      bodyChildren.push({ type: 'text', value: after });
    }
    bodyChildren.push(...firstParagraph.children.slice(i + 1));

    // Update the first paragraph to only contain heading children
    firstParagraph.children = headingChildren;
    didSplit = true;
    break;
  }

  return { didSplit, bodyChildren };
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
    // There are cases where the first paragraph contains the body content
    // Marked by a newline character. We need to split the paragraph into a heading and body.
    const { didSplit, bodyChildren } = firstParagraph.children && firstParagraph.children.length > 0
      ? splitBodyFromHeading(firstParagraph)
      : { didSplit: false, bodyChildren: [] };

    // Extract heading text using `plain()` to handle complex markdown structures
    // (e.g., bold text, inline code) in the heading, then remove the icon/match prefix.
    // Using `plain()` instead of direct string slicing ensures we properly extract
    // text content even when the heading contains formatting nodes.
    const heading = plain(firstParagraph as unknown as Parameters<typeof plain>[0])
      .toString()
      .slice(match.length);

    const empty = !heading.length && firstParagraph.children.length === 1;
    const theme = themes[icon] || 'default';

    const firstChild = findFirst(node.children[0]);
    if (firstChild && 'value' in firstChild && typeof firstChild.value === 'string') {
      firstChild.value = firstChild.value.slice(match.length);
    }

    // Wrap the first paragraph as a heading if there's heading text OR if we split.
    // We check `didSplit` because even if there's no heading text after the icon,
    // splitting indicates we need to create a heading structure (which may be empty).
    if (heading || didSplit) {
      node.children[0] = wrapHeading(node);
      // @note: We add to the offset/column the length of the unicode
      // character that was stripped off, so that the start position of the
      // heading/text matches where it actually starts.
      node.children[0].position.start.offset += match.length;
      node.children[0].position.start.column += match.length;
    }

    // If we split the paragraph, insert the body content as a new paragraph node
    // right after the heading. This ensures the callout structure is:
    // callout > heading + body paragraph(s)
    if (didSplit && bodyChildren && bodyChildren.length > 0) {
      const paragraphNode: Paragraph = {
        type: 'paragraph',
        children: bodyChildren,
      };
      node.children.splice(1, 0, paragraphNode);
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
