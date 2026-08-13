import type { Parent, Root, Table } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { mdxishAstProcessor, mdxishMdastToMd } from '../../../lib/mdxish';
import { parseMdxishWithResolvedSources, roundTripMdxish } from '../../helpers';

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

  // CX-3772: WYSIWYG mangled tab-block content because nodes re-parsed from a component
  // body carry offsets into that body, not the document. Each re-parsed subtree root is
  // stamped with `data.reparseSource`; descendants resolve via their nearest stamped
  // ancestor. These tests assert through that resolution, exactly as a consumer must.
  describe('re-parsed component body positions (CX-3772)', () => {
    // `Variable` declares no `type`, so it survives the discriminant check and the cast
    // is what actually reaches `name`.
    const findJsxChild = (parent: Parent, name: string): MdxJsxFlowElement =>
      parent.children.find(
        (child): child is MdxJsxFlowElement =>
          child.type === 'mdxJsxFlowElement' && (child as MdxJsxFlowElement).name === name,
      )!;

    const stampedNodeTypes = (tree: Root): string[] => {
      const stamped: string[] = [];
      visit(tree, node => {
        if (node.data?.reparseSource) stamped.push(node.type);
      });
      return stamped;
    };

    it('resolves every node in a nested component body to its own source', () => {
      const md = [
        '<Tabs>',
        '  <Tab title="Accounts">',
        '    ### Common Account Fields',
        '',
        '    <ExampleComponent />',
        '  </Tab>',
        '</Tabs>',
      ].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      // Top-level positions still index into the document, so `Tabs` carries no stamp.
      const tabs = findJsxChild(tree, 'Tabs');
      expect(tabs.data?.reparseSource).toBeUndefined();
      expect(sliceOf(tabs)).toBe(md);

      const tab = findJsxChild(tabs, 'Tab');
      expect(sliceOf(tab)).toBe(
        ['<Tab title="Accounts">', '  ### Common Account Fields', '', '  <ExampleComponent />', '</Tab>'].join('\n'),
      );

      const heading = tab.children.find(child => child.type === 'heading')!;
      expect(sliceOf(heading)).toBe('### Common Account Fields');
      expect(sliceOf(findJsxChild(tab, 'ExampleComponent'))).toBe('  <ExampleComponent />');
    });

    it('stamps only subtree roots, never their descendants', () => {
      const md = ['<Wrapper>', '  Some **bold** text', '</Wrapper>'].join('\n');
      const { tree } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      // The body's sole root is the paragraph; `strong`/`text` inherit from it.
      expect(stampedNodeTypes(tree)).toStrictEqual(['paragraph']);
    });

    it('resolves expression nodes inside a component body', () => {
      const md = ['<Wrapper>', '  {1 + 1}', '</Wrapper>'].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const expression = findJsxChild(tree, 'Wrapper').children.find(child => child.type === 'mdxFlowExpression')!;
      expect(sliceOf(expression)).toBe('{1 + 1}');
    });

    it('resolves siblings spliced after a self-closing component against their own source', () => {
      const md = ['<Wrapper>', '  <ExampleComponent />', '  Some *sibling* text', '</Wrapper>'].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const wrapper = findJsxChild(tree, 'Wrapper');
      const paragraph = wrapper.children.find(child => child.type === 'paragraph')!;
      expect(sliceOf(paragraph)).toBe('Some *sibling* text');

      const emphasis = (paragraph as Parent).children.find(child => child.type === 'emphasis')!;
      expect(sliceOf(emphasis)).toBe('*sibling*');
    });

    it('resolves deeply indented bodies against the dedented source', () => {
      const md = [
        '<Tabs>',
        '    <Tab title="One">',
        '',
        '        <ExampleComponent />',
        '',
        '    </Tab>',
        '</Tabs>',
      ].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const tab = findJsxChild(findJsxChild(tree, 'Tabs'), 'Tab');
      expect(sliceOf(findJsxChild(tab, 'ExampleComponent'))).toBe('<ExampleComponent />');
    });

    it('resolves ReadMe components nested inside other components at every depth', () => {
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
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const tab = findJsxChild(findJsxChild(tree, 'Tabs'), 'Tab');
      const cards = findJsxChild(tab, 'Cards');
      expect(sliceOf(cards)).toBe(
        [
          '<Cards columns={2}>',
          '  <Card title="First" icon="fa-rocket">',
          '    Card **body** text',
          '  </Card>',
          '</Cards>',
        ].join('\n'),
      );

      const card = findJsxChild(cards, 'Card');
      expect(sliceOf(card)).toBe(
        ['<Card title="First" icon="fa-rocket">', '  Card **body** text', '</Card>'].join('\n'),
      );

      const paragraph = card.children.find(child => child.type === 'paragraph')!;
      expect(sliceOf(paragraph)).toBe('Card **body** text');

      // Descendants of a stamped root inherit it rather than carrying their own copy.
      const strong = (paragraph as Parent).children.find(child => child.type === 'strong')!;
      expect(strong.data?.reparseSource).toBeUndefined();
      expect(sliceOf(strong)).toBe('**body**');
    });

    it('resolves a multi-line HTML sequence and the markdown between its tags', () => {
      const md = ['<Wrapper>', '  <div>', '    A **bold** move', '  </div>', '</Wrapper>'].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      // A multi-line lowercase tag stays a pair of html nodes with markdown between;
      // all three are body roots (the body re-parse adds the blank line after `<div>`).
      const wrapper = findJsxChild(tree, 'Wrapper');
      const openingTag = wrapper.children.find(child => child.type === 'html')!;
      expect(openingTag.data?.reparseSource).toBe('<div>\n\n  A **bold** move\n</div>');
      expect(sliceOf(openingTag)).toBe('<div>');

      const paragraph = wrapper.children.find(child => child.type === 'paragraph')!;
      expect(sliceOf(paragraph)).toBe('A **bold** move');
      expect(sliceOf((paragraph as Parent).children.find(child => child.type === 'strong')!)).toBe('**bold**');
    });

    it('resolves children of a single-line lowercase HTML tag promoted for markdown parsing', () => {
      const md = ['<Wrapper>', '  <div>A **bold** move</div>', '</Wrapper>'].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      // The body keeps its indent (RM-17790), and remark reports an indented html node's
      // position from the line start — so the span opens on the indent, as it does for
      // indented html outside a component body.
      const div = findJsxChild(findJsxChild(tree, 'Wrapper'), 'div');
      expect(sliceOf(div)).toBe('  <div>A **bold** move</div>');

      // A lowercase tag unwraps its sole paragraph, so phrasing sits directly under `div`.
      const strong = (div as Parent).children.find(child => child.type === 'strong')!;
      expect(sliceOf(strong)).toBe('**bold**');
    });

    it('resolves lowercase HTML promoted through an MDX expression attribute', () => {
      const md = ['<Wrapper>', '  <button style={{ color: "red" }}>Click me</button>', '</Wrapper>'].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const button = findJsxChild(findJsxChild(tree, 'Wrapper'), 'button');
      expect(sliceOf(button)).toBe('  <button style={{ color: "red" }}>Click me</button>');
    });

    it('resolves a component nested inside a list item of a component body', () => {
      const md = [
        '<Tabs>',
        '    <Tab title="One">',
        '        - item one',
        '        - <ExampleComponent />',
        '    </Tab>',
        '</Tabs>',
      ].join('\n');
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const tab = findJsxChild(findJsxChild(tree, 'Tabs'), 'Tab');
      const list = tab.children.find(child => child.type === 'list')!;
      const nested = findJsxChild((list as Parent).children[1] as Parent, 'ExampleComponent');
      expect(sliceOf(nested)).toBe('<ExampleComponent />');
    });

    it('resolves sibling components separated by extra blank lines against the same body source', () => {
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
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const wrapper = findJsxChild(tree, 'Wrapper');
      const first = findJsxChild(wrapper, 'First');
      const second = findJsxChild(wrapper, 'Second');

      expect(first.data?.reparseSource).toBe(second.data?.reparseSource);
      expect(sliceOf(first)).toBe('<First />');
      expect(sliceOf(second)).toBe(['<Second>', '  content', '</Second>'].join('\n'));
    });

    // The inline path re-parses bodies too, so it must stamp its roots for the same reason.
    it('resolves the re-parsed body of an inline component', () => {
      const md = 'Lead in <span style={{ color: "red" }}>an **emphatic** label</span> and out.';
      const { tree, sliceOf } = parseMdxishWithResolvedSources(md, { newEditorTypes: true });

      const paragraph = tree.children[0] as Parent;
      const span = paragraph.children.find(child => child.type === 'mdxJsxTextElement')!;
      expect(sliceOf(span)).toBe('<span style={{ color: "red" }}>an **emphatic** label</span>');

      const strong = (span as Parent).children.find(child => child.type === 'strong')!;
      expect(sliceOf(strong)).toBe('**emphatic**');
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
