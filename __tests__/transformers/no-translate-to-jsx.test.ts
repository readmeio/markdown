import type { NoTranslate } from '../../types';
import type { Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { describe, expect, it } from 'vitest';

import { NodeTypes } from '../../enums';
import mdxishNoTranslateToJsx from '../../processor/transform/mdxish/no-translate-to-jsx';

const emptyNoTranslate = (): NoTranslate => ({ type: NodeTypes.noTranslate, children: [], data: { hName: 'NoTranslate' } });

const emptyFlowNoTranslate = (): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'NoTranslate',
  attributes: [],
  children: [],
});

describe('mdxishNoTranslateToJsx', () => {
  it('gives every empty inline NoTranslate its own text child', () => {
    const tree: Root = { type: 'root', children: [{ type: 'paragraph', children: [emptyNoTranslate(), emptyNoTranslate()] }] };

    mdxishNoTranslateToJsx()(tree);

    const [first, second] = (tree.children[0] as { children: MdxJsxTextElement[] }).children;
    expect(first.children).toStrictEqual([{ type: 'text', value: '' }]);
    expect(first.children[0]).not.toBe(second.children[0]);
  });

  it('gives every empty block NoTranslate its own child', () => {
    const tree: Root = { type: 'root', children: [emptyFlowNoTranslate(), emptyFlowNoTranslate()] };

    mdxishNoTranslateToJsx()(tree);

    const [first, second] = tree.children as MdxJsxFlowElement[];
    expect(first.children).toHaveLength(1);
    expect(first.children[0]).not.toBe(second.children[0]);
  });
});
