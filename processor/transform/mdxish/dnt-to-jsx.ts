import type { Dnt } from '../../../types';
import type { Node, Parent, Text } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';

type DntElement = MdxJsxFlowElement | MdxJsxTextElement;

const isDnt = (node: Node): node is Dnt | DntElement =>
  node.type === NodeTypes.dnt ||
  ((node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') && (node as DntElement).name === 'DNT');

// An empty child list writes `<DNT />`. Alone on a line, that starts an HTML block
// that swallows the next lines raw. An empty text child keeps the `</DNT>`.
const EMPTY_TEXT: Text = { type: 'text', value: '' };

// Serializes mdxish DNT nodes as JSX `<DNT>`. The children go through the document's
// own serializer, so readme nodes inside (variables, emoji) keep their spelling.
const mdxishDntToJsx = (): Transform => tree => {
  visit(tree, isDnt, (node: Dnt | DntElement, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    if (node.type === 'mdxJsxFlowElement') {
      if (!node.children.length) node.children = [EMPTY_TEXT as unknown as MdxJsxFlowElement['children'][number]];
      return;
    }

    const jsx: MdxJsxTextElement = {
      type: 'mdxJsxTextElement',
      name: 'DNT',
      attributes: node.type === NodeTypes.dnt ? [] : node.attributes,
      children: node.children.length ? node.children : [EMPTY_TEXT],
      position: node.position,
    };

    parent.children[index] = jsx;
  });

  return tree;
};

export default mdxishDntToJsx;
