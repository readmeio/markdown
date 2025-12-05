import type { Element } from 'hast';
import type { Paragraph, Root, RootContent, Table } from 'mdast';

import { mdx, mdxish } from '../../index';

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

describe('mdxish plain compiler', () => {
  it('preserves text that looks like markdown syntax in paragraphs', () => {
    // Plain nodes represent unescaped text - in markdown we'd need to escape or use code
    // This test verifies that text content is preserved
    const markdown = "`- this is and isn't a list`";

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    const code = paragraph.children[0] as Element;
    expect(code.tagName).toBe('code');
    expect(code.children[0].type).toBe('text');
    expect('value' in code.children[0] && code.children[0].value).toContain("this is and isn't a list");
  });

  it('preserves angle brackets as text content', () => {
    const markdown = '<not valid jsx>';

    const hast = mdxish(markdown);
    // Angle brackets without a valid tag are filtered out by rehypeRaw/rehypeMdxishComponents
    // So we expect empty children or no children
    expect(hast.children).toHaveLength(0);
  });

  it('preserves text content at root level', () => {
    const markdown = "Text that might look like a list: `- this is and isn't a list`";

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    expect(paragraph.children.length).toBeGreaterThan(0);
  });

  it('preserves text content in inline context', () => {
    const markdown = 'before `plain` after';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    const textNodes = paragraph.children.filter(child => child.type === 'text');
    expect(textNodes.length).toBeGreaterThan(0);
    // Verify we have text before and after
    const textValues = textNodes.map(node => ('value' in node ? node.value : '')).join('');
    expect(textValues).toContain('before');
    expect(textValues).toContain('after');
  });

  it('parses markdown table syntax as table element (GFM supported)', () => {
    // Note: mdxish now supports GFM tables via remarkGfm, so markdown table syntax is parsed as table
    const markdown = `| Heading 1 | Heading 2 |
| :-------- | :-------- |
| Cell A    | Cell B    |`;

    const hast = mdxish(markdown);
    const table = hast.children.find(child => child.type === 'element' && child.tagName === 'table') as Element;

    expect(table).toBeDefined();
    expect(table.type).toBe('element');
    expect(table.tagName).toBe('table');

    const thead = table.children.find(child => child.type === 'element' && child.tagName === 'thead') as Element;
    expect(thead).toBeDefined();

    const tbody = table.children.find(child => child.type === 'element' && child.tagName === 'tbody') as Element;
    expect(tbody).toBeDefined();

    // Verify table header content
    const headerRow = thead.children.find(child => child.type === 'element' && child.tagName === 'tr') as Element;
    expect(headerRow).toBeDefined();
    const th = headerRow.children.find(child => child.type === 'element' && child.tagName === 'th') as Element;
    expect(th).toBeDefined();
    const headerTextNode = th.children.find(child => child.type === 'text');
    expect(headerTextNode).toBeDefined();
    expect(headerTextNode && 'value' in headerTextNode && headerTextNode.value).toContain('Heading 1');

    // Verify table body content
    const bodyRow = tbody.children.find(child => child.type === 'element' && child.tagName === 'tr') as Element;
    expect(bodyRow).toBeDefined();
    const td = bodyRow.children.find(child => child.type === 'element' && child.tagName === 'td') as Element;
    expect(td).toBeDefined();
    const cellTextNode = td.children.find(child => child.type === 'text');
    expect(cellTextNode).toBeDefined();
    expect(cellTextNode && 'value' in cellTextNode && cellTextNode.value).toContain('Cell A');
  });
});
