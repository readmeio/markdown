import type { Root as MdastRoot, RootContent } from 'mdast';

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
          },
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('<Table');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('<td');
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
          },
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('<Table');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tbody>');
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
          },
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('| Name');
      expect(result).not.toContain('<Table');
    });
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
