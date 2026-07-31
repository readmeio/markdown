import type { Node, Parent, Root, Strong, Table } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { mdxishAstProcessor, mdxishMdastToMd } from '../../../lib/mdxish';
import { roundTripMdxish } from '../../helpers';

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
      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      // IMPORTANT: Must call runSync() to execute transformers (e.g., evaluateExpression).
      // This is why the test couldn't catch the regression in RM-15705.
      const mdast = processor.runSync(processor.parse(parserReadyContent));
      // The mdast should still have mdxTextExpression nodes - evaluation happens in mdxish()
      const hasMdxExpression = JSON.stringify(mdast).includes('mdxTextExpression');
      expect(hasMdxExpression).toBe(true);
    });

    it('should preserve attribute expressions as mdxJsxAttributeValueExpression nodes', () => {
      const md = '<Component attr={1+1} />';
      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      const mdast = processor.runSync(processor.parse(parserReadyContent));

      expect(mdast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Component',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'attr',
                value: {
                  type: 'mdxJsxAttributeValueExpression',
                  value: '1+1',
                },
              },
            ],
          },
        ],
      });
    });
  });

  describe('component node positions', () => {
    it('keeps a lowercase tag inline with trailing content on the same line', () => {
      const md =
        '<button className="pill" style={{ backgroundColor: "#ffc107" }}>PrPr</button> ***service-explorer***: Message brokers are now surfaced as entities.';
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { newEditorTypes: true });
      const mdast = processor.runSync(processor.parse(parserReadyContent));

      expect(mdast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'mdxJsxTextElement', name: 'button' },
              { type: 'text', value: ' ' },
              { type: 'emphasis' },
              { type: 'text', value: ': Message brokers are now surfaced as entities.' },
            ],
          },
        ],
      });
    });

    it('ends a component node position at its closing tag when trailing content follows on the same line', () => {
      const md =
        '<Component attr={1+1}>PrPr</Component> ***service-explorer***: Message brokers are now surfaced as entities.';
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { newEditorTypes: true });
      const mdast = processor.runSync(processor.parse(parserReadyContent));

      // Offset 38 is the end of `</Component>`; the trailing text is a separate sibling.
      expect(mdast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Component',
            position: {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 39, offset: 38 },
            },
          },
          { type: 'paragraph' },
        ],
      });
    });
  });

  describe('re-parsed component body positions', () => {
    const parseMdast = (md: string): Root => {
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { newEditorTypes: true });
      return processor.runSync(processor.parse(parserReadyContent)) as Root;
    };

    const findJsxChild = (parent: Parent, name: string): MdxJsxFlowElement =>
      parent.children.find(
        (child): child is MdxJsxFlowElement => child.type === 'mdxJsxFlowElement' && (child as MdxJsxFlowElement).name === name,
      )!;

    const sliceReparseSource = (node: Node): string | undefined =>
      node.data?.reparseSource?.slice(node.position?.start.offset, node.position?.end.offset);

    it('stamps nodes inside a component body with the source their positions refer to', () => {
      const md = [
        '<Tabs>',
        '  <Tab title="Accounts">',
        '    ### Common Account Fields',
        '',
        '    <ExampleComponent />',
        '  </Tab>',
        '</Tabs>',
      ].join('\n');
      const mdast = parseMdast(md);

      // Top-level node positions still refer to the document, so it carries no stamp.
      const tabs = findJsxChild(mdast, 'Tabs');
      expect(tabs.data?.reparseSource).toBeUndefined();

      const tab = findJsxChild(tabs, 'Tab');
      expect(sliceReparseSource(tab)).toBe(
        ['<Tab title="Accounts">', '  ### Common Account Fields', '', '  <ExampleComponent />', '</Tab>'].join('\n'),
      );

      const nested = findJsxChild(tab, 'ExampleComponent');
      expect(sliceReparseSource(nested)).toBe('  <ExampleComponent />');
    });

    it('stamps expression nodes inside a component body', () => {
      const md = ['<Wrapper>', '  {1 + 1}', '</Wrapper>'].join('\n');
      const mdast = parseMdast(md);

      const expression = findJsxChild(mdast, 'Wrapper').children.find(child => child.type === 'mdxFlowExpression')!;
      expect(sliceReparseSource(expression)).toBe('{1 + 1}');
    });

    it('stamps siblings spliced after a self-closing component with their own source', () => {
      const md = ['<Wrapper>', '  <ExampleComponent />', '  Some *sibling* text', '</Wrapper>'].join('\n');
      const mdast = parseMdast(md);

      const wrapper = findJsxChild(mdast, 'Wrapper');
      const paragraph = wrapper.children.find(child => child.type === 'paragraph')!;
      expect(sliceReparseSource(paragraph)).toBe('Some *sibling* text');

      const emphasis = paragraph.children.find(child => child.type === 'emphasis')!;
      expect(sliceReparseSource(emphasis)).toBe('*sibling*');
    });

    it('stamps deeply indented bodies with the dedented source', () => {
      const md = [
        '<Tabs>',
        '    <Tab title="One">',
        '',
        '        <ExampleComponent />',
        '',
        '    </Tab>',
        '</Tabs>',
      ].join('\n');
      const mdast = parseMdast(md);

      const tab = findJsxChild(findJsxChild(mdast, 'Tabs'), 'Tab');
      const nested = findJsxChild(tab, 'ExampleComponent');
      expect(sliceReparseSource(nested)).toBe('<ExampleComponent />');
    });

    it('stamps ReadMe components nested inside other components at every depth', () => {
      const md = [
        '<Tabs>',
        '  <Tab title="One">',
        '    <Cards columns={2}>',
        '      <Card title="First" icon="fa-rocket">',
        '        Card **body** text',
        '      </Card>',
        '    </Cards>',
        '  </Tab>',
        '</Tabs>',
      ].join('\n');
      const mdast = parseMdast(md);

      const tab = findJsxChild(findJsxChild(mdast, 'Tabs'), 'Tab');
      const cards = findJsxChild(tab, 'Cards');
      expect(sliceReparseSource(cards)).toBe(
        [
          '<Cards columns={2}>',
          '  <Card title="First" icon="fa-rocket">',
          '    Card **body** text',
          '  </Card>',
          '</Cards>',
        ].join('\n'),
      );

      const card = findJsxChild(cards, 'Card');
      expect(sliceReparseSource(card)).toBe(
        ['<Card title="First" icon="fa-rocket">', '  Card **body** text', '</Card>'].join('\n'),
      );

      const paragraph = card.children.find(child => child.type === 'paragraph')!;
      expect(sliceReparseSource(paragraph)).toBe('Card **body** text');
    });

    it('stamps a multi-line HTML sequence and the markdown between its tags', () => {
      const md = ['<Wrapper>', '  <div>', '    A **bold** move', '  </div>', '</Wrapper>'].join('\n');
      const mdast = parseMdast(md);

      // A multi-line lowercase tag stays a pair of html nodes with markdown between;
      // all three share the body's re-parsed source (blank line added by the body re-parse).
      const wrapper = findJsxChild(mdast, 'Wrapper');
      const bodySource = '<div>\n\n  A **bold** move\n</div>';
      const openingTag = wrapper.children.find(child => child.type === 'html')!;
      expect(openingTag.data?.reparseSource).toBe(bodySource);

      const paragraph = wrapper.children.find(child => child.type === 'paragraph')!;
      expect(sliceReparseSource(paragraph)).toBe('A **bold** move');

      const strong = paragraph.children.find(child => child.type === 'strong')!;
      expect(sliceReparseSource(strong)).toBe('**bold**');
    });

    it('stamps children of a single-line lowercase HTML tag promoted for markdown parsing', () => {
      const md = ['<Wrapper>', '  <div>A **bold** move</div>', '</Wrapper>'].join('\n');
      const mdast = parseMdast(md);

      const div = findJsxChild(findJsxChild(mdast, 'Wrapper'), 'div');
      expect(sliceReparseSource(div)).toBe('<div>A **bold** move</div>');

      // Lowercase promotion unwraps the sole paragraph, so phrasing sits directly on the div.
      const strong = (div.children as Node[]).find((child): child is Strong => child.type === 'strong')!;
      expect(sliceReparseSource(strong)).toBe('**bold**');
    });

    it('stamps lowercase HTML promoted through an MDX expression attribute', () => {
      const md = ['<Wrapper>', '  <button style={{ color: "red" }}>Click me</button>', '</Wrapper>'].join('\n');
      const mdast = parseMdast(md);

      const button = findJsxChild(findJsxChild(mdast, 'Wrapper'), 'button');
      expect(sliceReparseSource(button)).toBe('<button style={{ color: "red" }}>Click me</button>');
    });

    it('stamps a component nested inside a list item of a component body', () => {
      const md = [
        '<Tabs>',
        '    <Tab title="One">',
        '        - item one',
        '        - <ExampleComponent />',
        '    </Tab>',
        '</Tabs>',
      ].join('\n');
      const mdast = parseMdast(md);

      const tab = findJsxChild(findJsxChild(mdast, 'Tabs'), 'Tab');
      const list = tab.children.find(child => child.type === 'list')!;
      const secondItem = list.children[1];
      const nested = findJsxChild(secondItem, 'ExampleComponent');
      expect(sliceReparseSource(nested)).toBe('<ExampleComponent />');
    });

    it('stamps sibling components separated by extra blank lines with the same body source', () => {
      const md = [
        '<Wrapper>',
        '',
        '  <First />',
        '',
        '',
        '  <Second>',
        '    content',
        '  </Second>',
        '',
        '</Wrapper>',
      ].join('\n');
      const mdast = parseMdast(md);

      const wrapper = findJsxChild(mdast, 'Wrapper');
      const first = findJsxChild(wrapper, 'First');
      const second = findJsxChild(wrapper, 'Second');

      expect(first.data?.reparseSource).toBe(second.data?.reparseSource);
      expect(sliceReparseSource(first)).toBe('<First />');
      expect(sliceReparseSource(second)).toBe(['<Second>', '  content', '</Second>'].join('\n'));
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

    it('should round-trip a body-only JSX Callout without promoting body to title', () => {
      const md = `<Callout icon="📘" theme="info">
Content here
</Callout>
`;

      const out = roundTripMdxish(md, { newEditorTypes: true });

      expect(out).not.toMatch(/^>\s*📘\s+Content here/);

      const second = mdxishAstProcessor(out, { newEditorTypes: true });
      const tree2 = second.processor.runSync(second.processor.parse(second.parserReadyContent)) as Root;
      const callout = tree2.children[0] as {
        children: { type: string }[];
        data?: { hProperties?: { empty?: boolean } };
      };

      expect(callout.data?.hProperties?.empty).toBe(true);
      const firstChildText = (callout.children[0] as { children?: { value?: string }[] }).children?.[0]?.value ?? '';
      expect(firstChildText).toBe('');
      expect(callout.children[1]).toMatchObject({
        type: 'paragraph',
        children: [{ type: 'text', value: 'Content here' }],
      });
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
