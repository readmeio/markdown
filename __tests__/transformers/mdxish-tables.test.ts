import type { Root } from 'mdast';

import { mdxishAstProcessor } from '../../lib/mdxish';

const astProcessor = (md: string): Root => {
  const { processor, parserReadyContent } = mdxishAstProcessor(md);
  return processor.runSync(processor.parse(parserReadyContent)) as Root;
};

describe('mdxish tables transformation', () => {
  describe('given \\n in table cell', () => {
    it('should split lines in a magic block table cell into paragraphs', () => {
      const md = `[block:parameters]
  {
    "data": {
      "h-0": "Item",
      "0-0": "Line 1 \\n\\nLine 2 \\n\\nLine 3"
    },
    "cols": 1,
    "rows": 1,
    "align": ["left"]
  }
  [/block]`;
      const ast = astProcessor(md);

      expect(ast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableHead',
                    children: [{ type: 'text', value: 'Item' }],
                  },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 1' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 2' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 3' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('should split lines in a JSX <Table> cell into paragraphs', () => {
      const md = `<Table align={["left"]}>
    <thead>
      <tr>
        <th style={{ textAlign: "left" }}>
        </th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td style={{ textAlign: "left" }}>
          Line 1

          Line 3

          Line 5
        </td>
      </tr>
    </tbody>
  </Table>`;
      const ast = astProcessor(md);

      expect(ast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [{ type: 'tableCell', children: [] }],
              },
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 1' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 3' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 5' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  it('should unwrap a sole paragraph in a table cell', () => {
    const md = `<Table align={["left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Header
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Just one line
      </td>
    </tr>
  </tbody>
</Table>`;
    const ast = astProcessor(md);

    expect(ast).toMatchObject({
      type: 'root',
      children: [
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [{ type: 'text', value: 'Header' }],
                },
              ],
            },
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [{ type: 'text', value: 'Just one line' }],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
