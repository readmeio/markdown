import type { Root, Table } from 'mdast';

import { mdxishAstProcessor, mdxishMdastToMd } from '../../../lib/mdxish';

describe('mdxishAstProcessor', () => {
  describe('deferred processing (handled by mdxish rendering pipeline)', () => {
    it('should NOT remove JSX comments', () => {
      const md = 'Hello {/* this is a comment */} world';
      const { parserReadyContent } = mdxishAstProcessor(md);
      // JSX comments should still be present - removal happens in mdxish()
      expect(parserReadyContent).toContain('{/* this is a comment */}');
    });

    it('should NOT evaluate MDX expressions', () => {
      const md = 'Result: {5 * 10}';
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { jsxContext: {} });
      // IMPORTANT: Must call runSync() to execute transformers (e.g., evaluateExpression).
      // This is why the test couldn't catch the regression in RM-15705.
      const mdast = processor.runSync(processor.parse(parserReadyContent));
      // The mdast should still have mdxTextExpression nodes - evaluation happens in mdxish()
      const hasMdxExpression = JSON.stringify(mdast).includes('mdxTextExpression');
      expect(hasMdxExpression).toBe(true);
    });
  });

  it('should return a unified processor and parser-ready content for simple text', () => {
    const md = 'Rafe is **cool**!';
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    expect(parserReadyContent).toBe(md);
    expect(processor).toBeDefined();
    expect(typeof processor.parse).toBe('function');

    const ast = processor.parse(parserReadyContent);
    // @ts-expect-error - custom matcher
    expect(ast).toStrictEqualExceptPosition({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Rafe is ',
            },
            {
              type: 'strong',
              children: [
                {
                  type: 'text',
                  value: 'cool',
                },
              ],
            },
            {
              type: 'text',
              value: '!',
            },
          ],
        },
      ],
    });
  });

  it('should apply readme flavored md transformers', () => {
    const md = `> 📘 Info
>
> Lorem ipsum dolor sit amet.`;
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    // Need to run the processor to apply transformers
    const parsedAst = processor.parse(parserReadyContent);
    const ast = processor.runSync(parsedAst) as Root;

    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(1);

    // After running transformers, the blockquote should be converted to rdme-callout
    expect(ast.children[0].type).toBe('rdme-callout');

    const callout = ast.children[0];
    expect(callout.data).toBeDefined();
    // @ts-expect-error - custom callout data structure
    expect(callout.data?.hProperties).toBeDefined();
    // @ts-expect-error - custom callout data structure
    expect(callout.data?.hProperties?.theme).toBe('info');
  });

  it('should handle GFM', () => {
    const md = '~~strikethrough~~';
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    const ast = processor.parse(parserReadyContent);

    // @ts-expect-error - custom matcher
    expect(ast).toStrictEqualExceptPosition({
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
    });
  });

  it('should convert GFM checklist nodes and retain checkboxes that have no text after them', () => {
    const md = `- [ ] hi
- [ ] `;
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    const ast = processor.parse(parserReadyContent);

    expect(md).toBe(parserReadyContent);
    // @ts-expect-error - custom matcher
    expect(ast).toStrictEqualExceptPosition({
      type: 'root',
      children: [
        {
          type: 'list',
          ordered: false,
          spread: false,
          start: null,
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
          ],
        },
      ],
    });
  });

  describe('JSX Table deserialization', () => {
    it('should convert a JSX Table with flow content to an MDAST table node', () => {
      const md = `<Table align={[null,"center",null]}>
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>\`string\`</td>
      <td>A plain text cell.</td>
      <td>
        \`\`\`text
        \`\`\`
      </td>
    </tr>
  </tbody>
</Table>`;

      const { processor, parserReadyContent } = mdxishAstProcessor(md, { newEditorTypes: true });
      const ast = processor.runSync(processor.parse(parserReadyContent)) as Root;

      const tableNode = ast.children[0] as Table;
      expect(tableNode.type).toBe('table');
      expect(tableNode.align).toStrictEqual([null, 'center', null]);
    });

    it('should convert JSX Tables with thead to MDAST when newEditorTypes is true', () => {
      const md = `<Table>
  <thead>
    <tr>
      <th>Name</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alice</td>
    </tr>
  </tbody>
</Table>`;

      const { processor: withEditor, parserReadyContent: src1 } = mdxishAstProcessor(md, { newEditorTypes: true });
      const withEditorAst = withEditor.runSync(withEditor.parse(src1)) as Root;
      expect(withEditorAst.children[0].type).toBe('table');

      const { processor: withoutEditor, parserReadyContent: src2 } = mdxishAstProcessor(md);
      const withoutEditorAst = withoutEditor.runSync(withoutEditor.parse(src2)) as Root;
      expect(withoutEditorAst.children[0].type).toBe('table');
    });

    it('should preserve alignment through a serialize → parse roundtrip', () => {
      const mdast: Root = {
        type: 'root',
        children: [
          {
            type: 'table',
            align: [null, 'center', null],
            children: [
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Name' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Type' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Desc' }] }] },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'foo' }] }] },
                  { type: 'tableCell', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'bar' }] }] },
                  { type: 'tableCell', children: [{ type: 'code', lang: null, meta: null, value: 'multi\nline' }] },
                ],
              },
            ],
          },
        ],
      };

      const markdown = mdxishMdastToMd(mdast);
      expect(markdown).toContain('align={[null,"center",null]}');

      const { processor, parserReadyContent } = mdxishAstProcessor(markdown, { newEditorTypes: true });
      const parsed = processor.runSync(processor.parse(parserReadyContent)) as Root;

      const tableNode = parsed.children[0] as Table;
      expect(tableNode.type).toBe('table');
      expect(tableNode.align).toStrictEqual([null, 'center', null]);
    });

    it('should keep header-less JSX Tables as JSX elements', () => {
      const md = `<Table>
  <tbody>
    <tr>
      <td>no header</td>
    </tr>
  </tbody>
</Table>`;

      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      const ast = processor.runSync(processor.parse(parserReadyContent)) as Root;

      expect(ast.children[0].type).not.toBe('table');
    });
  });

  it('should only normalize empty checklist items when whitespace exists after ]', () => {
    const md = `- [ ]
- [ ] `;
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    const ast = processor.parse(parserReadyContent);

    expect(md).toBe(parserReadyContent);
    // @ts-expect-error - custom matcher
    expect(ast).toStrictEqualExceptPosition({
      type: 'root',
      children: [
        {
          type: 'list',
          ordered: false,
          spread: false,
          start: null,
          children: [
            {
              type: 'listItem',
              checked: null,
              spread: false,
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', value: '[ ]' }],
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
          ],
        },
      ],
    });
  });
});
