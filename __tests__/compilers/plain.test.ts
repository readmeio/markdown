import type { Paragraph, Root } from 'mdast';

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
});
