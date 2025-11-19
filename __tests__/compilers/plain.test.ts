import type { Paragraph, Root, RootContent, Table } from 'mdast';

import { mdx, mix } from '../../index';

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

  it('treats plain nodes as phrasing in tables', () => {
    const ast: Root = {
      type: 'root',
      children: [
        {
          type: 'table',
          align: ['left', 'left'],
          children: [
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableHead',
                  children: [
                    {
                      type: 'plain',
                      value: 'Heading 1',
                    },
                  ],
                },
                {
                  type: 'tableHead',
                  children: [
                    {
                      type: 'plain',
                      value: 'Heading 2',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [
                    {
                      type: 'plain',
                      value: 'Cell A',
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  children: [
                    {
                      type: 'plain',
                      value: 'Cell B',
                    },
                  ],
                },
              ],
            },
          ],
        } as Table,
      ],
    };

    expect(mdx(ast)).toMatchInlineSnapshot(`
      "| Heading 1 | Heading 2 |
      | :-------- | :-------- |
      | Cell A    | Cell B    |
      "
    `);
  });
});

describe('mix plain compiler', () => {
  it.skip('compiles plain nodes', () => {
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

    expect(mix(ast)).toBe(`${md}\n`);
  });

  it.skip('compiles plain nodes and does not escape characters', () => {
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

    expect(mix(ast)).toBe(`${md}\n`);
  });

  it.skip('compiles plain nodes at the root level', () => {
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

    expect(mix(ast)).toBe(`${md}\n`);
  });

  it.skip('compiles plain nodes in an inline context', () => {
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

    expect(mix(ast)).toBe('before plain after\n');
  });

  it.skip('treats plain nodes as phrasing in tables', () => {
    const ast: Root = {
      type: 'root',
      children: [
        {
          type: 'table',
          align: ['left', 'left'],
          children: [
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableHead',
                  children: [
                    {
                      type: 'plain',
                      value: 'Heading 1',
                    },
                  ],
                },
                {
                  type: 'tableHead',
                  children: [
                    {
                      type: 'plain',
                      value: 'Heading 2',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [
                    {
                      type: 'plain',
                      value: 'Cell A',
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  children: [
                    {
                      type: 'plain',
                      value: 'Cell B',
                    },
                  ],
                },
              ],
            },
          ],
        } as Table,
      ],
    };

    expect(mix(ast)).toMatchInlineSnapshot(`
      "| Heading 1 | Heading 2 |
      | :-------- | :-------- |
      | Cell A    | Cell B    |
      "
    `);
  });
});
