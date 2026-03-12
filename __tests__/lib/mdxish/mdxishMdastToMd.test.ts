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
