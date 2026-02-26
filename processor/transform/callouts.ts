import type { Blockquote, Heading, Node, Paragraph, Parent, Root, Text } from 'mdast';
import type { Callout } from 'types';

import emojiRegex from 'emoji-regex';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

import { themes } from '../../components/Callout';
import { NodeTypes } from '../../enums';
import plain from '../../lib/plain';

import { extractText } from './extract-text';

const titleParser = unified().use(remarkParse);

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

/**
 * Finds the first text node containing a newline in a paragraph's children.
 * Returns the index and the newline position within that text node.
 */
const findNewlineInParagraph = (paragraph: Paragraph): { index: number; newlineIndex: number } | null => {
  for (let i = 0; i < paragraph.children.length; i += 1) {
    const child = paragraph.children[i];
    if (child.type === 'text' && typeof child.value === 'string') {
      const newlineIndex = child.value.indexOf('\n');
      if (newlineIndex !== -1) {
        return { index: i, newlineIndex };
      }
    }
  }
  return null;
};

/**
 * Splits a paragraph at the first newline, separating heading content (before \n)
 * from body content (after \n). Mutates the paragraph to contain only heading children.
 */
const splitParagraphAtNewline = (paragraph: Paragraph): Paragraph['children'] | null => {
  const splitPoint = findNewlineInParagraph(paragraph);
  if (!splitPoint) return null;

  const { index, newlineIndex } = splitPoint;
  const originalChildren = paragraph.children;
  const textNode = originalChildren[index] as Text;
  const beforeNewline = textNode.value.slice(0, newlineIndex);
  const afterNewline = textNode.value.slice(newlineIndex + 1);

  // Split paragraph: heading = children[0..index-1] + text before newline
  const headingChildren = originalChildren.slice(0, index);
  if (beforeNewline.length > 0 || headingChildren.length === 0) {
    headingChildren.push({ type: 'text', value: beforeNewline });
  }
  paragraph.children = headingChildren;

  // Body = text after newline + remaining children from original array
  const bodyChildren: Paragraph['children'] = [];
  if (afterNewline.length > 0) {
    bodyChildren.push({ type: 'text', value: afterNewline });
  }
  bodyChildren.push(...originalChildren.slice(index + 1));

  return bodyChildren.length > 0 ? bodyChildren : null;
};

/**
 * Removes the icon/match prefix from the first text node in a paragraph.
 * This is needed to clean up the raw AST after we've extracted the icon.
 */
const removeIconPrefix = (paragraph: Paragraph, prefixLength: number) => {
  const firstTextNode = findFirst(paragraph);
  if (firstTextNode && 'value' in firstTextNode && typeof firstTextNode.value === 'string') {
    firstTextNode.value = firstTextNode.value.slice(prefixLength);
  }
};

const processBlockquote = (node: Blockquote, index: number | undefined, parent: Parent | undefined) => {
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

  const firstParagraphOriginalEnd = firstParagraph.position.end;

  if (icon && match) {
    // Handle cases where heading and body are on the same line separated by a newline.
    // Example: "> ⚠️ **Bold heading**\nBody text here"
    const bodyChildren = splitParagraphAtNewline(firstParagraph);
    const didSplit = bodyChildren !== null;

    removeIconPrefix(firstParagraph, match.length);

    const firstText = findFirst(firstParagraph) as Text | null;
    const rawValue = firstText?.value ?? '';
    const hasContent = rawValue.trim().length > 0 || firstParagraph.children.length > 1;
    const empty = !hasContent;
    const theme = themes[icon] || 'default';

    if (hasContent || didSplit) {
      const headingMatch = rawValue.match(/^(#{1,6})\s*/);

      // # heading syntax is handled via direct AST manipulation so we can
      // set the depth while preserving the original inline children (bold, etc.)
      if (headingMatch) {
        firstText!.value = rawValue.slice(headingMatch[0].length);
        const heading = wrapHeading(node);
        heading.depth = headingMatch[1].length as Heading['depth'];
        node.children[0] = heading;
        node.children[0].position.start.offset += match.length;
        node.children[0].position.start.column += match.length;
      } else {
        const headingText = plain(firstParagraph as unknown as Parameters<typeof plain>[0]).toString();
        const parsedTitle = titleParser.parse(headingText);
        const parsedFirstChild = parsedTitle.children[0];

        // Block-level syntax ("> quote", "- list") produces non-paragraph nodes;
        // inline text parses as a paragraph and falls through to wrapHeading().
        if (parsedFirstChild && parsedFirstChild.type !== 'paragraph') {
          visit(parsedTitle, (n: Node) => {
            delete n.position;
          });
          node.children.splice(0, 1, ...(parsedTitle.children as Blockquote['children']));
        } else {
          node.children[0] = wrapHeading(node);
          node.children[0].position.start.offset += match.length;
          node.children[0].position.start.column += match.length;
        }
      }
    }

    // Insert body content as a separate paragraph after the heading
    if (bodyChildren) {
      node.children.splice(1, 0, {
        type: 'paragraph',
        children: bodyChildren,
        position: {
          start: node.children[0].position.end,
          end: firstParagraphOriginalEnd,
        },
      });
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
      // Skip visiting children after converting to callout to prevent re-processing
      // parsed block-level title content (e.g., blockquotes from "> Quote" titles).
      if ((node as unknown as { type: string }).type === NodeTypes.callout) {
        return SKIP;
      }
      return undefined;
    });
  };
};

export default calloutTransformer;
