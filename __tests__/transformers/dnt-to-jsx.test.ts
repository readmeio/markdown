import type { Dnt } from '../../types';
import type { Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { describe, expect, it } from 'vitest';

import { NodeTypes } from '../../enums';
import mdxishDntToJsx from '../../processor/transform/mdxish/dnt-to-jsx';

const emptyDnt = (): Dnt => ({ type: NodeTypes.dnt, children: [], data: { hName: 'DNT' } });

const emptyFlowDnt = (): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'DNT',
  attributes: [],
  children: [],
});

describe('mdxishDntToJsx', () => {
  it('gives every empty inline DNT its own text child', () => {
    const tree: Root = { type: 'root', children: [{ type: 'paragraph', children: [emptyDnt(), emptyDnt()] }] };

    mdxishDntToJsx()(tree);

    const [first, second] = (tree.children[0] as { children: MdxJsxTextElement[] }).children;
    expect(first.children).toStrictEqual([{ type: 'text', value: '' }]);
    expect(first.children[0]).not.toBe(second.children[0]);
  });

  it('gives every empty block DNT its own child', () => {
    const tree: Root = { type: 'root', children: [emptyFlowDnt(), emptyFlowDnt()] };

    mdxishDntToJsx()(tree);

    const [first, second] = tree.children as MdxJsxFlowElement[];
    expect(first.children).toHaveLength(1);
    expect(first.children[0]).not.toBe(second.children[0]);
  });
});
