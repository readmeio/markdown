import type { Dnt } from '../../types';
import type { Root } from 'mdast';

import { NodeTypes } from '../../enums';
import dntToJsx from '../../processor/transform/mdxish/dnt-to-jsx';

const dnt = (value: string): Dnt => ({
  type: NodeTypes.dnt,
  children: [{ type: 'text', value }],
  data: { hName: 'DNT' },
});

describe('dnt-to-jsx transformer', () => {
  it('rewrites a DNT node into a DNT element that keeps its children', () => {
    const tree: Root = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Hello ' }, dnt('Acme')] }],
    };

    dntToJsx()(tree);

    expect(tree.children[0]).toStrictEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'Hello ' },
        {
          type: 'mdxJsxTextElement',
          name: 'DNT',
          attributes: [],
          children: [{ type: 'text', value: 'Acme' }],
          position: undefined,
        },
      ],
    });
  });

  it('leaves a DNT node with no parent as is', () => {
    const node = dnt('Acme');

    const result = dntToJsx()(node as never);

    expect(result).toStrictEqual(dnt('Acme'));
  });
});
