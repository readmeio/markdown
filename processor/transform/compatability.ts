import type { HTMLBlock } from '../../types';
import type { Emphasis, Image, Strong, Node, Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { phrasing } from 'mdast-util-phrasing';
import { EXIT, SKIP, visit } from 'unist-util-visit';

import { reformatHTML, toAttributes } from '../utils';

const strongTest = (node: Node): node is Emphasis | Strong => ['emphasis', 'strong'].includes(node.type);

const compatibilityTransfomer = (): Transform => tree => {
  const trimEmphasis = (node: Emphasis | Strong) => {
    visit(node, 'text', child => {
      child.value = child.value.trim();
      return EXIT;
    });

    return node;
  };

  visit(tree, strongTest, node => {
    trimEmphasis(node);
    return SKIP;
  });

  visit(tree, 'image', (node: Image, index: number, parent: Parent) => {
    if (phrasing(parent) || !parent.children.every(child => child.type === 'image' || !phrasing(child))) return;

    parent.children.splice(index, 1, { type: 'paragraph', children: [node] });
  });

  visit(tree, 'html-block', (node: HTMLBlock, index: number, parent: Parent) => {
    const { html, runScripts } = node.data?.hProperties || {};
    const string = JSON.stringify(html);

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'HTMLBlock',
      attributes: toAttributes({ runScripts }),
      children: [
        {
          type: 'mdxFlowExpression',
          value: string,
          data: {
            estree: {
              type: 'Program',
              body: [
                {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'Literal',
                    value: html,
                    raw: string,
                  },
                },
              ],
              sourceType: 'module',
              comments: [],
            },
          },
        },
      ],
    });
  });

  return tree;
};

export default compatibilityTransfomer;
