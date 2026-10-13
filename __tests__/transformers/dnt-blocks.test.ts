import type { Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import dntBlocksToDiv from '../../processor/transform/dnt-blocks';

const flow = (name: string, children: MdxJsxFlowElement['children']): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name,
  attributes: [],
  children,
});

const paragraph = { type: 'paragraph' as const, children: [{ type: 'text' as const, value: 'Acme' }] };

const run = (node: MdxJsxFlowElement) => {
  const tree: Root = { type: 'root', children: [node] };
  (dntBlocksToDiv as () => (tree: Root) => void)()(tree);
  return tree.children[0];
};

describe('dnt-blocks transformer', () => {
  it('turns a block DNT into a translate="no" div', () => {
    expect(run(flow('DNT', [paragraph]))).toStrictEqual({
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [{ type: 'mdxJsxAttribute', name: 'translate', value: 'no' }],
      children: [paragraph],
    });
  });

  it.each([
    ['an empty DNT', flow('DNT', [])],
    ['another component', flow('Callout', [paragraph])],
  ])('leaves %s as is', (_label, node) => {
    expect(run(structuredClone(node))).toStrictEqual(node);
  });
});
