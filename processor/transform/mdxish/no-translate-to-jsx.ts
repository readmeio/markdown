import type { NoTranslate } from '../../../types';
import type { Node, Parent, Text } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';

const isInlineNoTranslate = (node: Node): node is MdxJsxTextElement | NoTranslate =>
  node.type === NodeTypes.noTranslate ||
  (node.type === 'mdxJsxTextElement' && (node as MdxJsxTextElement).name === 'NoTranslate');

// An empty child list writes `<NoTranslate />`, which at the start of a line reparses as a block.
// An empty child keeps the `</NoTranslate>`, so it stays inline. A fresh one per node.
const emptyText = (): Text => ({ type: 'text', value: '' });

// Serializes mdxish NoTranslate nodes as JSX `<NoTranslate>`. The children go through the document's
// own serializer, so readme nodes inside (variables, emoji) keep their spelling.
const mdxishNoTranslateToJsx = (): Transform => tree => {
  visit(tree, isInlineNoTranslate, (node: MdxJsxTextElement | NoTranslate, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

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
