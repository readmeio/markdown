import type { NoTranslate } from '../../../types';
import type { Node, Paragraph, Parent, Text } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';

type NoTranslateElement = MdxJsxFlowElement | MdxJsxTextElement;

const isNoTranslate = (node: Node): node is NoTranslate | NoTranslateElement =>
  node.type === NodeTypes.noTranslate ||
  ((node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') && (node as NoTranslateElement).name === 'NoTranslate');

// An empty child list writes `<NoTranslate />`. Alone on a line, that starts an HTML block
// that swallows the next lines raw. An empty child keeps the `</NoTranslate>`, a fresh one per node.
const emptyText = (): Text => ({ type: 'text', value: '' });
const emptyParagraph = (): Paragraph => ({ type: 'paragraph', children: [] });

// Serializes mdxish NoTranslate nodes as JSX `<NoTranslate>`. The children go through the document's
// own serializer, so readme nodes inside (variables, emoji) keep their spelling.
const mdxishNoTranslateToJsx = (): Transform => tree => {
  visit(tree, isNoTranslate, (node: NoTranslate | NoTranslateElement, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    if (node.type === 'mdxJsxFlowElement') {
      if (!node.children.length) node.children = [emptyParagraph()];
      return;
    }

    const jsx: MdxJsxTextElement = {
      type: 'mdxJsxTextElement',
      name: 'NoTranslate',
      attributes: node.type === NodeTypes.noTranslate ? [] : node.attributes,
      children: node.children.length ? node.children : [emptyText()],
      position: node.position,
    };

    parent.children[index] = jsx;
  });

  return tree;
};

export default mdxishNoTranslateToJsx;
