import type { Root as MdastRoot, RootContent, Table } from 'mdast';

import { NodeTypes } from '../../../enums';
import { mdxishMdastToMd } from '../../../lib';

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
    expect(result).toContain('> 📘 Info');
    expect(result).toContain('Lorem ipsum dolor sit amet.');
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
