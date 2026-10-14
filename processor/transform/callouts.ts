import type { Blockquote, Heading, Node, Paragraph, Parent, Root, Text } from 'mdast';
import type { Callout } from 'types';

import emojiRegex from 'emoji-regex';
import { gfmToMarkdown } from 'mdast-util-gfm';
import { mdxExpressionToMarkdown } from 'mdast-util-mdx-expression';
import { toMarkdown } from 'mdast-util-to-markdown';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

import { themes } from '../../components/Callout';
import { NodeTypes } from '../../enums';
import plain from '../../lib/plain';
import compatibility from '../compile/compatibility';
import gemoji from '../compile/gemoji';
import variable from '../compile/variable';
import { assignEnclosingPosition, createValueRangeMapper, spanOf } from '../utils';

import { extractText } from './extract-text';

const titleParser = unified().use(remarkParse).use(remarkGfm);
// The title paragraph may contain custom AST nodes that `toMarkdown` doesn't
// natively understand
const toMarkdownExtensions = [
  gfmToMarkdown(),
  // For mdx variable syntaxes (e.g., {user.name})
  mdxExpressionToMarkdown(),
  // Important: This is required and would crash the parser if there's no variable, gemoji, fa-icon, or glossary node handler
  {
    handlers: {
      [NodeTypes.variable]: variable,
      [NodeTypes.emoji]: gemoji,
      [NodeTypes.i]: compatibility,
      [NodeTypes.glossary]: compatibility,
    },
  },
];

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

const findFirst = (node: Node): Node | null => {
  if ('children' in node) return findFirst(node.children[0]);
  if (node.type === 'text') return node;
  return null;
};

export const wrapHeading = (node: Blockquote | Callout): Heading => {
  const firstChild = node.children[0];
  const children = ('children' in firstChild ? firstChild.children : []) as Heading['children'];

  return {
    type: 'heading' as Heading['type'],
    depth: 3,
    children,
    // The title is its own children (the icon is already gone), not the whole first paragraph.
    position: spanOf(children) ?? spanOf([firstChild]),
  };
};

/** Moves a text node's start past `length` characters removed from the front of its first line. */
const trimTextStart = (text: Text, length: number) => {
  const removed = Math.min(length, text.value.length);
  text.value = text.value.slice(length);
  if (!text.position) return;
  const { start } = text.position;
  text.position = {
    ...text.position,
    start: { line: start.line, column: start.column + removed, offset: (start.offset ?? 0) + removed },
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
const splitParagraphAtNewline = (paragraph: Paragraph, source?: string): Paragraph['children'] | null => {
  const splitPoint = findNewlineInParagraph(paragraph);
  if (!splitPoint) return null;

  const { index, newlineIndex } = splitPoint;
  const originalChildren = paragraph.children;
  const textNode = originalChildren[index] as Text;
  // A CRLF line ending's `\r` belongs to neither the title nor the body.
  const titleEnd = textNode.value[newlineIndex - 1] === '\r' ? newlineIndex - 1 : newlineIndex;
  const beforeNewline = textNode.value.slice(0, titleEnd);
  const afterNewline = textNode.value.slice(newlineIndex + 1);
  // Mapped through the value, since the body's line lost its `> ` prefix.
  const rangeOf = createValueRangeMapper(textNode.position, textNode.value, source);

  // Split paragraph: heading = children[0..index-1] + text before newline
  const headingChildren = originalChildren.slice(0, index);
  if (beforeNewline.length > 0 || headingChildren.length === 0) {
    headingChildren.push({ type: 'text', value: beforeNewline, position: rangeOf(0, titleEnd) });
  }
  paragraph.children = headingChildren;

  // Body = text after newline + remaining children from original array
  const bodyChildren: Paragraph['children'] = [];
  if (afterNewline.length > 0) {
    bodyChildren.push({
      type: 'text',
      value: afterNewline,
      position: rangeOf(newlineIndex + 1, textNode.value.length),
    });
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
  if (firstTextNode?.type === 'text') trimTextStart(firstTextNode as Text, prefixLength);
};

const processBlockquote = (
  node: Blockquote,
  index: number | undefined,
  parent: Parent | undefined,
  isMdxish = false,
  source?: string,
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
        position: node.position && structuredClone(node.position),
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
    // Handle cases where heading and body are on the same line separated by a newline.
    // Example: "> ⚠️ **Bold heading**\nBody text here"
    const bodyChildren = splitParagraphAtNewline(firstParagraph, source);
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
        // Wrapped first so the heading spans its `#` markers, which the text then drops.
        const heading = wrapHeading(node);
        trimTextStart(firstText!, headingMatch[0].length);
        heading.depth = headingMatch[1].length as Heading['depth'];
        node.children[0] = heading;
      } else if (isMdxish) {
        // Block-level title re-parsing is only needed for MDXish where HTML stays
        // as raw nodes. In MDX, remarkMdx has already converted HTML to JSX AST
        // nodes which toMarkdown can't serialize — and MDX doesn't need this
        // block-level title handling anyway.
        const headingText = toMarkdown(
          { type: 'root', children: [firstParagraph] },
          {
            extensions: toMarkdownExtensions,
          },
        )
          .trim()
          .replace(/^\\(?=[>#+\-*])/, '');
        const parsedTitle = titleParser.parse(headingText);
        const parsedFirstChild = parsedTitle.children[0];

        // Block-level syntax ("> quote", "- list") produces non-paragraph nodes;
        // inline text parses as a paragraph and falls through to wrapHeading().
        if (parsedFirstChild && parsedFirstChild.type !== 'paragraph') {
          // The re-parse reads serialized title text, so its nodes take the title's whole range.
          const heading = wrapHeading(node);
          assignEnclosingPosition(parsedTitle.children, heading.position);
          heading.children = parsedTitle.children as Heading['children'];
          node.children[0] = heading;
        } else {
          node.children[0] = wrapHeading(node);
        }
      } else {
        node.children[0] = wrapHeading(node);
      }
    }

    // Insert body content as a separate paragraph after the heading
    if (bodyChildren) {
      node.children.splice(1, 0, { type: 'paragraph', children: bodyChildren, position: spanOf(bodyChildren) });
    }

    Object.assign(node, {
      type: NodeTypes.callout,
      // Keep the blockquote's existing data.
      data: {
        ...node.data,
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

const calloutTransformer = ({ isMdxish = false } = {}) => {
  let source: string | undefined;
  const processNode = (root: Node) => {
    visit(root, 'blockquote', (node: Blockquote, index: number | undefined, parent: Parent | undefined) => {
      processBlockquote(node, index, parent, isMdxish, source);
      if ((node as unknown as { type: string }).type === NodeTypes.callout) {
        // SKIP prevents re-processing synthetic blockquotes in parsed title content
        // (e.g., blockquotes from "> Quote" titles). Recursively process body children
        // (index 1+, skipping the heading at 0) to handle nested callouts.
        for (let i = 1; i < node.children.length; i += 1) {
          processNode(node.children[i]);
        }
        return SKIP;
      }
      return undefined;
    });
  };
  return (tree: Root, file?: { value?: unknown }) => {
    source = file?.value ? String(file.value) : undefined;
    processNode(tree);
  };
};

export default calloutTransformer;
