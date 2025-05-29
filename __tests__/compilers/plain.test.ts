import type { Paragraph, Root, RootContent } from 'mdast';

import { mdx } from '../../index';

describe('plain compiler', () => {
  it('compiles plain nodes', () => {
    const md = "- this is and isn't a list";
    const ast: Root = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'plain',
              value: md,
            },
          ],
        } as Paragraph,
      ],
    };

    expect(mdx(ast)).toBe(`${md}\n`);
  });

  it('compiles plain nodes and does not escape characters', () => {
    const md = '<not valid jsx>';
    const ast: Root = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'plain',
              value: md,
            },
          ],
        } as Paragraph,
      ],
    };

    expect(mdx(ast)).toBe(`${md}\n`);
  });

  it('compiles plain nodes at the root level', () => {
    const md = "- this is and isn't a list";
    const ast: Root = {
      type: 'root',
      children: [
        {
          type: 'plain',
          value: md,
        },
      ] as RootContent[],
    };

    expect(mdx(ast)).toBe(`${md}\n`);
  });

  it('compiles plain nodes in an inline context', () => {
    const ast: Root = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'before' },
            {
              type: 'plain',
              value: ' plain ',
            },
            { type: 'text', value: 'after' },
          ],
        },
      ] as RootContent[],
    };

    expect(mdx(ast)).toBe('before plain after\n');
  });
});
