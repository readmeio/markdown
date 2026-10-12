import type { Dnt } from '../../../types';
import type { Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';

/**
 * Serializes mdxish DNT nodes to JSX `<DNT>` syntax. The children go through the
 * document's own serializer, so readme nodes inside (variables, emoji) keep their spelling.
 */
const mdxishDntToJsx = (): Transform => tree => {
  visit(tree, NodeTypes.dnt, (node: Dnt, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const jsx: MdxJsxTextElement = {
      type: 'mdxJsxTextElement',
      name: 'DNT',
      attributes: [],
      // An empty child list writes `<DNT />`. Alone on a line, that starts an HTML block
      // that swallows the next lines raw. An empty text child keeps the `</DNT>`.
      children: node.children.length ? node.children : [{ type: 'text', value: '' }],
      position: node.position,
    };

    parent.children[index] = jsx;
  });

  return tree;
};

export default mdxishDntToJsx;
