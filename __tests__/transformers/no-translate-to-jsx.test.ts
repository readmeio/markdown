import type { NoTranslate } from '../../types';
import type { Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { describe, expect, it } from 'vitest';

import { NodeTypes } from '../../enums';
import mdxishNoTranslateToJsx from '../../processor/transform/mdxish/no-translate-to-jsx';

const emptyNoTranslate = (): NoTranslate => ({
  type: NodeTypes.noTranslate,
  children: [],
  data: { hName: 'NoTranslate' },
});

const emptyFlowNoTranslate = (): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'NoTranslate',
  attributes: [],
  children: [],
});

describe('mdxishNoTranslateToJsx', () => {
  it('gives every empty inline NoTranslate its own text child', () => {
    const tree: Root = {
      type: 'root',
      children: [{ type: 'paragraph', children: [emptyNoTranslate(), emptyNoTranslate()] }],
    };

    mdxishNoTranslateToJsx()(tree);

    const [first, second] = (tree.children[0] as { children: MdxJsxTextElement[] }).children;
    expect(first.children).toStrictEqual([{ type: 'text', value: '' }]);
    expect(first.children[0]).not.toBe(second.children[0]);
  });

  // Alone on a line, `<NoTranslate />` now reparses as an empty block, so it needs no child.
  it('leaves an empty block NoTranslate childless', () => {
    const tree: Root = { type: 'root', children: [emptyFlowNoTranslate()] };

    mdxishNoTranslateToJsx()(tree);

    expect((tree.children[0] as MdxJsxFlowElement).children).toHaveLength(0);
  });
});
