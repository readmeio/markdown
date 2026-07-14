import type { Root as MdastRoot, RootContent, Table } from 'mdast';

import { NodeTypes } from '../../../enums';
import { mdxishMdastToMd } from '../../../lib';
import { roundTripMdxish } from '../../helpers';

describe('mdxishMdastToMd', () => {
  it('should convert a simple paragraph', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Hello world' }],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('Hello world\n');
  });

  it('should convert readme flavored mdast', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'rdme-callout',
          data: {
            hName: 'Callout',
            hProperties: {
              theme: 'info',
              icon: '📘 Info',
              empty: false,
            },
          },
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Lorem ipsum dolor sit amet.' }],
            },
          ],
        } as RootContent,
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toContain('<Callout icon="📘 Info" theme="info">');
    expect(result).toContain('Lorem ipsum dolor sit amet.');
    expect(result).toContain('</Callout>');
  });

  it('should convert GFM mdast', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'delete',
              children: [
                {
                  type: 'text',
                  value: 'strikethrough',
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toContain('~~strikethrough~~');
  });

  it('should handle empty root', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('');
  });

  it('should convert readme-variable nodes back to {user.<name>} syntax', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Hello ' },
            {
              type: NodeTypes.variable,
              data: {
                hName: 'Variable',
                hProperties: { name: 'name' },
              },
              value: '{user.name}',
            },
            { type: 'text', value: '!' },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('Hello {user.name}!\n');
  });

  it('should handle multiple variable nodes in the same paragraph', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: NodeTypes.variable,
              data: {
                hName: 'Variable',
                hProperties: { name: 'name' },
              },
              value: '{user.name}',
            },
            { type: 'text', value: ' - ' },
            {
              type: NodeTypes.variable,
              data: {
                hName: 'Variable',
                hProperties: { name: 'email' },
              },
              value: '{user.email}',
            },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('{user.name} - {user.email}\n');
  });

  describe('tables with flow content', () => {
    it('should serialize a table with newlines in cells to JSX <Table>', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: ['left', 'left'],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Field' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Description' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'orderby' }] }] },
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'code',
                        lang: null,
                        meta: null,
                        value: '{\n  "field": "ID",\n  "type": "ASC"\n}',
                      },
                    ],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "<Table align={["left","left"]}>
          <thead>
            <tr>
              <th>
                Field
              </th>

              <th>
                Description
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                orderby
              </td>

              <td>
                \`\`\`
                {
                  "field": "ID",
                  "type": "ASC"
                }
                \`\`\`
              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });

    it('should serialize a table with newlines in cells to JSX <Table> and separate the lines with an empty line between them', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: ['left'],
            children: [
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: 'text',
                            value: 'Line 1'
                          }
                        ]
                      },
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: 'text',
                            value: 'Line 2'
                          }
                        ]
                      },
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: 'text',
                            value: 'Line 3'
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          } as Table
        ]
      };

      const serialized = mdxishMdastToMd(mdast);
      expect(serialized).toMatchInlineSnapshot(`
        "<Table align={["left"]}>
          <thead>
            <tr>
              <th>
                Line 1

                Line 2

                Line 3
              </th>
            </tr>
          </thead>

          <tbody />
        </Table>
        "
      `);
    });

    it('should serialize a table with list content in cells to JSX <Table>', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: ['left', 'left'],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Name' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Items' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'groceries' }] }] },
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'list',
                        ordered: false,
                        spread: false,
                        children: [
                          { type: 'listItem', spread: false, children: [{ type: 'paragraph', children: [{ type: 'text', value: 'apples' }] }] },
                          { type: 'listItem', spread: false, children: [{ type: 'paragraph', children: [{ type: 'text', value: 'bananas' }] }] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "<Table align={["left","left"]}>
          <thead>
            <tr>
              <th>
                Name
              </th>

              <th>
                Items
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                groceries
              </td>

              <td>
                - apples
                - bananas
              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });

    it('should include align attribute and per-column styles when columns have alignment', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: ['left', 'center', 'right'],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'A' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'B' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'C' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'left' }] }] },
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'code',
                        lang: null,
                        meta: null,
                        value: 'multi\nline',
                      },
                    ],
                  },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'right' }] }] },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "<Table align={["left","center","right"]}>
          <thead>
            <tr>
              <th>
                A
              </th>

              <th style={{ textAlign: "center" }}>
                B
              </th>

              <th style={{ textAlign: "right" }}>
                C
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                left
              </td>

              <td style={{ textAlign: "center" }}>
                \`\`\`
                multi
                line
                \`\`\`
              </td>

              <td style={{ textAlign: "right" }}>
                right
              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });

    it('should omit align attribute when all alignments are null', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'A' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'B' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'x' }] }] },
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'code',
                        lang: null,
                        meta: null,
                        value: 'block\ncontent',
                      },
                    ],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "<Table>
          <thead>
            <tr>
              <th>
                A
              </th>

              <th>
                B
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                x
              </td>

              <td>
                \`\`\`
                block
                content
                \`\`\`
              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });

    it('should handle a table with multiple body rows', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Key' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Value' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'a' }] }] },
                  {
                    type: 'tableCell',
                    children: [{ type: 'code', lang: null, meta: null, value: 'line1\nline2' }],
                  },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'b' }] }] },
                  {
                    type: 'tableCell',
                    children: [{ type: 'code', lang: null, meta: null, value: 'line3\nline4' }],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "<Table>
          <thead>
            <tr>
              <th>
                Key
              </th>

              <th>
                Value
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                a
              </td>

              <td>
                \`\`\`
                line1
                line2
                \`\`\`
              </td>
            </tr>

            <tr>
              <td>
                b
              </td>

              <td>
                \`\`\`
                line3
                line4
                \`\`\`
              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });

    it('should handle an empty cell alongside flow content', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'A' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'B' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [] },
                  {
                    type: 'tableCell',
                    children: [{ type: 'code', lang: null, meta: null, value: 'x\ny' }],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "<Table>
          <thead>
            <tr>
              <th>
                A
              </th>

              <th>
                B
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td />

              <td>
                \`\`\`
                x
                y
                \`\`\`
              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });

    it('should handle inline formatting in phrasing-only cells as markdown', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Name' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Desc' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'paragraph',
                        children: [
                          { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
                          { type: 'text', value: ' and ' },
                          { type: 'emphasis', children: [{ type: 'text', value: 'italic' }] },
                        ],
                      },
                    ],
                  },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'plain' }] }] },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "| Name                  | Desc  |
        | --------------------- | ----- |
        | **bold** and _italic_ | plain |
        "
      `);
    });

    it('should keep tables with raw html nodes as markdown to avoid breaking remarkMdx roundtrip', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Header' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Content' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'row1' }] }] },
                  {
                    type: 'tableCell',
                    children: [{ type: 'html', value: '<br class="custom" />' }],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "| Header | Content               |
        | ------ | --------------------- |
        | row1   | <br class="custom" /> |
        "
      `);
    });

    it('should convert tables with code-tabs content to JSX', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Lang' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Example' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'JS' }] }] },
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'code-tabs',
                        children: [
                          { type: 'code', lang: 'js', meta: null, value: 'console.log("hi")' },
                        ],
                      } as unknown as MdastRoot['children'][number],
                    ],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "<Table>
          <thead>
            <tr>
              <th>
                Lang
              </th>

              <th>
                Example
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                JS
              </td>

              <td>
                \`\`\`js
                console.log("hi")
                \`\`\`
              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    });

    it('should serialize a table with self-closing JSX component in cell to JSX <Table>', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Column' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Image' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Row' }] }] },
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'html',
                        value: '\n<Image src="https://example.com/image.jpg" caption="Hello" />\n',
                      },
                    ],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('<Table>');
      expect(result).toContain('<Image src="https://example.com/image.jpg" caption="Hello" />');
    });

    it('should keep table with plain HTML in cell as GFM', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Column' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'HTML' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Row' }] }] },
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'html',
                        value: '<div>Hello</div>',
                      },
                    ],
                  },
                ],
              },
            ],
          } as Table,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('|');
      expect(result).not.toContain('<Table>');
    });

    it('should keep tables with readme-variable nodes as GFM markdown', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null],
            children: [
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: NodeTypes.variable,
                            data: { hName: 'Variable', hProperties: { name: 'WHOA' } },
                            value: '{user.WHOA}',
                          } as unknown as MdastRoot['children'][number],
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }] },
                ],
              },
            ],
          } as Table,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('|');
      expect(result).not.toContain('<Table>');
    });

    it('should keep tables with readme-variable alongside text as GFM markdown', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      {
                        type: 'paragraph',
                        children: [
                          { type: 'text', value: 'Hello ' },
                          {
                            type: NodeTypes.variable,
                            data: { hName: 'Variable', hProperties: { name: 'name' } },
                            value: '{user.name}',
                          } as unknown as MdastRoot['children'][number],
                        ],
                      },
                    ],
                  },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Value' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'a' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'b' }] }] },
                ],
              },
            ],
          } as Table,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('|');
      expect(result).not.toContain('<Table>');
    });

    it('should keep phrasing-only tables as markdown tables', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: ['left', 'left'],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Name' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Age' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Alice' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: '30' }] }] },
                ],
              },
            ],
          } as Table,
        ],
      };

      expect(mdxishMdastToMd(mdast)).toMatchInlineSnapshot(`
        "| Name  | Age |
        | :---- | :-- |
        | Alice | 30  |
        "
      `);
    });
  });

  describe('underscores serialization', () => {
    const paragraph = (value: string): MdastRoot => ({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
    });

    it('should not escape underscores flanked by word characters', () => {
      expect(mdxishMdastToMd(paragraph('payroll_setup.pay_schedule_setup_not_complete'))).toBe(
        'payroll_setup.pay_schedule_setup_not_complete\n',
      );
    });

    it('should not escape consecutive intraword underscores', () => {
      expect(mdxishMdastToMd(paragraph('leading__double__trailing'))).toBe('leading__double__trailing\n');
    });

    it('should not escape intraword underscores between non-ASCII letters', () => {
      expect(mdxishMdastToMd(paragraph('café_touché'))).toBe('café_touché\n');
    });

    it('should still escape underscores at word boundaries that could open emphasis', () => {
      expect(roundTripMdxish('_leading and trailing_')).toBe('_leading and trailing_\n');
    });

    it('should not escape intraword underscores inside table cells', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Category' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Value' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'pay_schedule_transition' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'entity_type' }] }] },
                ],
              },
            ],
          } as Table,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('pay_schedule_transition');
      expect(result).toContain('entity_type');
      expect(result).not.toContain('\\_');
    });
  });

  describe('braces serialization', () => {
    const paragraph = (value: string): MdastRoot => ({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
    });

    it('should escape a lone literal open brace in text', () => {
      expect(mdxishMdastToMd(paragraph('{label'))).toBe('\\{label\n');
    });

    it('should preserve escaped closed braces in text', () => {
      expect(roundTripMdxish('a\\{b}c')).toBe('a\\{b\\}c\n');
    });

    it('should keep escaped braces stable across two round trips', () => {
      const once = roundTripMdxish('vars \\{label}, \\{payment_period}\n', { newEditorTypes: true });
      const twice = roundTripMdxish(once, { newEditorTypes: true });
      expect(once).toBe(twice);
    });

    it('should not escape underscores that sit inside literal braces', () => {
      expect(roundTripMdxish('for the %\\{payment_period} pay period.\n', { newEditorTypes: true })).not.toContain('\\_');
    });

    it('should not escape the braces of a readme-variable expression', () => {
      expect(roundTripMdxish('Hello {user.name}!\n', { newEditorTypes: true })).toBe('Hello {user.name}!\n');
    });

    it('should escape literal braces inside table cells', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Title' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Vars' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Run payroll%{label' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: '{label}' }] }] },
                ],
              },
            ],
          } as Table,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('Run payroll%\\{label');
      expect(result).toContain('\\{label\\}');
    });

    it('should preserve JSX table attributes while escaping braces in a cell', () => {
      // A list in a cell forces JSX <Table> output; attribute braces must survive.
      const out = roundTripMdxish(
        [
          '<Table align={["left"]}>',
          '  <thead><tr><th style={{ textAlign: "left" }}>A</th></tr></thead>',
          '  <tbody><tr><td style={{ textAlign: "left" }}>',
          '',
          '- x',
          '- y',
          '',
          '  </td></tr></tbody>',
          '</Table>',
          '',
        ].join('\n'),
        { newEditorTypes: true },
      );

      expect(out).toContain('align={["left"]}');
      expect(out).toContain('style={{ textAlign: "left" }}');
      expect(out).not.toContain('align={\\[');
    });
  });

  describe('git round-trip of a Callout with an unbalanced brace in a fence (CX-3704)', () => {
    // The customer's real trigger: a truncated snippet (more `{` than `}`) fenced
    // inside a Callout. Before the fix the mis-parsed tree re-serialized as
    // corrupted Markdown on every save: bullets escaped to `\*`, lists flattened,
    // prose wrapped in fences, and `</Callout>` merged onto the preceding line.
    const md = `<Callout icon="⚠️" theme="warn">
  Update your reverse-proxy config:

  \`\`\`nginx
  location / {
      proxy_pass http://backend;
  \`\`\`

  Then restart the service.
</Callout>

- First list item
- Second list item

Final plain paragraph at end of file.
`;

    it('serializes back without corrupting the surrounding Markdown', () => {
      const out = roundTripMdxish(md);
      const lines = out.split('\n');

      // `</Callout>` closes on its own line (not merged onto text).
      expect(lines).toContain('</Callout>');
      // No bullets escaped to `\*`.
      expect(out).not.toContain('\\*');
      // The list survives as a list (two items), not flattened prose.
      expect(out).toContain('- First list item');
      expect(out).toContain('- Second list item');
      // Trailing prose is a paragraph, not wrapped in a code fence.
      expect(out).toContain('Final plain paragraph at end of file.');
      // The unbalanced brace stays inside the fenced code block.
      expect(out).toContain('location / {');
    });

    it('is idempotent — re-saving does not re-corrupt the file', () => {
      const once = roundTripMdxish(md);
      const twice = roundTripMdxish(once);
      expect(twice).toBe(once);
    });
  });

  it('should convert readme-anchor nodes back to <Anchor> JSX syntax', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Click ' },
            {
              type: NodeTypes.anchor,
              data: {
                hName: 'Anchor',
                hProperties: {
                  href: 'https://example.com',
                  target: '_blank',
                },
              },
              children: [{ type: 'text', value: 'here' }],
            },
            { type: 'text', value: ' to open.' },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('Click <Anchor target="_blank" href="https://example.com">here</Anchor> to open.\n');
  });

  it('should convert readme-anchor nodes with formatted content', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: NodeTypes.anchor,
              data: {
                hName: 'Anchor',
                hProperties: {
                  href: 'https://example.com',
                  target: '_blank',
                },
              },
              children: [
                {
                  type: 'strong',
                  children: [{ type: 'text', value: 'bold link' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('<Anchor target="_blank" href="https://example.com">**bold link**</Anchor>\n');
  });

  it('should convert readme-anchor nodes with all attributes', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: NodeTypes.anchor,
              data: {
                hName: 'Anchor',
                hProperties: {
                  href: 'https://example.com',
                  target: '_blank',
                  title: 'Example Site',
                  label: 'example',
                },
              },
              children: [{ type: 'text', value: 'example' }],
            },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('<Anchor label="example" target="_blank" href="https://example.com" title="Example Site">example</Anchor>\n');
  });

  it('should handle multiple anchor nodes in the same paragraph', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: NodeTypes.anchor,
              data: {
                hName: 'Anchor',
                hProperties: { href: 'https://one.com', target: '_blank' },
              },
              children: [{ type: 'text', value: 'one' }],
            },
            { type: 'text', value: ' and ' },
            {
              type: NodeTypes.anchor,
              data: {
                hName: 'Anchor',
                hProperties: { href: 'https://two.com', target: '_blank' },
              },
              children: [{ type: 'text', value: 'two' }],
            },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('<Anchor target="_blank" href="https://one.com">one</Anchor> and <Anchor target="_blank" href="https://two.com">two</Anchor>\n');
  });

  it('should convert gfm checklist nodes and retain checkboxes that have no text after them', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'list',
          ordered: false,
          spread: false,
          children: [
            {
              type: 'listItem',
              checked: false,
              spread: false,
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', value: 'hi' }],
                },
              ],
            },
            {
              type: 'listItem',
              checked: false,
              spread: false,
              children: [
                {
                  type: 'paragraph',
                  children: [],
                },
              ],
            },
            {
              type: 'listItem',
              checked: true,
              spread: false,
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', value: 'there' }],
                },
              ],
            },
            {
              type: 'listItem',
              checked: true,
              spread: false,
              children: [
                {
                  type: 'paragraph',
                  children: [],
                },
              ],
            },
            // Normal bullet list item should not be affected
            {
              type: 'listItem',
              spread: false,
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', value: 'normal' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    // There needs to be a space after the checkbox for the list item to be parsed as a checklist item
    expect(result).toBe('- [ ] hi\n- [ ] \n- [x] there\n- [x] \n- normal\n');
  });
});

describe('mdxishMdastToMd callout JSX serialization', () => {
  const callout = (hProperties: Record<string, unknown>, children: RootContent[]): MdastRoot => ({
    type: 'root',
    children: [
      {
        type: NodeTypes.callout,
        data: { hName: 'Callout', hProperties },
        children,
      } as RootContent,
    ],
  });

  it('always serializes a callout with a heading to JSX, persisting icon + theme', () => {
    const mdast = callout({ icon: '📘', theme: 'info', empty: false }, [
      { type: 'heading', depth: 3, children: [{ type: 'text', value: 'Title here' }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'Body with markdown.' }] },
    ]);

    expect(mdxishMdastToMd(mdast)).toBe(
      `<Callout icon="📘" theme="info">
  ### Title here

  Body with markdown.
</Callout>
`,
    );
  });

  it('drops the empty title slot for a body-only callout', () => {
    const mdast = callout({ icon: '📘', theme: 'info', empty: true }, [
      { type: 'paragraph', children: [{ type: 'text', value: '' }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'Content here' }] },
    ]);

    expect(mdxishMdastToMd(mdast)).toBe(
      `<Callout icon="📘" theme="info">
  Content here
</Callout>
`,
    );
  });

  it('serializes a custom fa-icon callout to JSX', () => {
    const mdast = callout({ icon: 'fad fa-wagon-covered', theme: 'warn', empty: false }, [
      { type: 'heading', depth: 3, children: [{ type: 'text', value: 'Heads up' }] },
    ]);

    const result = mdxishMdastToMd(mdast);
    expect(result).toContain('<Callout icon="fad fa-wagon-covered" theme="warn">');
    expect(result).toContain('### Heads up');
  });

  it('serializes a callout with font awesome icons to JSX', () => {
    const mdast = callout({ icon: 'far fa-car-bolt', theme: 'info', empty: false }, [
      { type: 'heading', depth: 3, children: [{ type: 'text', value: 'Heads up' }] },
    ]);

    const result = mdxishMdastToMd(mdast);
    expect(result).toContain('<Callout icon="far fa-car-bolt" theme="info">');
    expect(result).toContain('### Heads up');
  });

  it('fills a missing theme from the icon', () => {
    const mdast = callout({ icon: '🚧', empty: false }, [
      { type: 'heading', depth: 3, children: [{ type: 'text', value: 'Watch out' }] },
    ]);

    expect(mdxishMdastToMd(mdast)).toContain('<Callout icon="🚧" theme="warn">');
  });

  it('fills a missing icon from the theme', () => {
    const mdast = callout({ theme: 'info', empty: false }, [
      { type: 'heading', depth: 3, children: [{ type: 'text', value: 'FYI' }] },
    ]);

    expect(mdxishMdastToMd(mdast)).toContain('<Callout icon="📘" theme="info">');
  });

  it('converts nested callouts in the body to JSX', () => {
    const mdast = callout({ icon: '📘', theme: 'info', empty: false }, [
      { type: 'heading', depth: 3, children: [{ type: 'text', value: 'Outer' }] },
      {
        type: NodeTypes.callout,
        data: { hName: 'Callout', hProperties: { icon: '🚧', theme: 'warn', empty: false } },
        children: [{ type: 'heading', depth: 3, children: [{ type: 'text', value: 'Inner' }] }],
      } as RootContent,
    ]);

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe(`<Callout icon="📘" theme="info">
  ### Outer

  <Callout icon="🚧" theme="warn">
    ### Inner
  </Callout>
</Callout>
`);
  });
});
