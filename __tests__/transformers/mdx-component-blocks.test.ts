import type { Code, Heading, Parent, Root } from 'mdast';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { mdxComponentFromMarkdown } from '../../lib/mdast-util/mdx-component';
import { mdxComponent } from '../../lib/micromark/mdx-component';
import mdxishComponentBlocks from '../../processor/transform/mdxish/components/mdx-blocks';
import mdxishSelfClosingBlocks from '../../processor/transform/mdxish/components/self-closing-blocks';
import { collectNodes, parseMdxish } from '../helpers';

interface MdxJsxFlowElement extends Parent {
  name?: string;
  type: 'mdxJsxFlowElement';
}

/**
 * Helper to parse markdown and apply the component block plugins.
 * Includes the mdx-component micromark tokenizer to capture multi-line
 * components as single HTML nodes before the transformer runs.
 */
const parseWithPlugin = (markdown: string): Root => {
  const processor = unified()
    .data('micromarkExtensions', [mdxComponent()])
    .data('fromMarkdownExtensions', [mdxComponentFromMarkdown()])
    .use(remarkParse)
    .use(mdxishSelfClosingBlocks)
    .use(mdxishComponentBlocks);
  const tree = processor.parse(markdown);
  processor.runSync(tree);
  return tree as Root;
};

describe('block-level MDX components transformation', () => {
  describe('mdxishComponentBlocks plugin', () => {
    describe('case 1: simple self-closing tags', () => {
      it('should transform a simple self-closing tag', () => {
        const markdown = '<MyComponent />';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          children: [],
        });
      });

      it('should transform a self-closing tag with attributes', () => {
        const markdown = '<MyComponent theme="dark" size="large" />';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          attributes: [
            { type: 'mdxJsxAttribute', name: 'theme', value: 'dark' },
            { type: 'mdxJsxAttribute', name: 'size', value: 'large' },
          ],
        });
      });

      it('should transform a multi-line self-closing tag', () => {
        const markdown = `<Embed
  typeOfEmbed="youtube"
  url="https://example.com"
/>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'Embed',
          attributes: [
            { type: 'mdxJsxAttribute', name: 'typeOfEmbed', value: 'youtube' },
            { type: 'mdxJsxAttribute', name: 'url', value: 'https://example.com' },
          ],
          children: [],
        });
      });

      it('should transform a multi-line self-closing tag with many attributes', () => {
        const markdown = `<Embed
  typeOfEmbed="youtube"
  url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  html="%3Ciframe%3E"
  href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  providerUrl="https://www.youtube.com/"
  providerName="YouTube"
/>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'Embed',
          attributes: [
            { type: 'mdxJsxAttribute', name: 'typeOfEmbed', value: 'youtube' },
            { type: 'mdxJsxAttribute', name: 'url', value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { type: 'mdxJsxAttribute', name: 'html', value: '%3Ciframe%3E' },
            { type: 'mdxJsxAttribute', name: 'href', value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { type: 'mdxJsxAttribute', name: 'providerUrl', value: 'https://www.youtube.com/' },
            { type: 'mdxJsxAttribute', name: 'providerName', value: 'YouTube' },
          ],
          children: [],
        });
      });

      it('should transform a multi-line self-closing Recipe tag', () => {
        const markdown = `<Recipe
  slug="my-recipe"
  title="My Recipe"
/>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'Recipe',
          attributes: [
            { type: 'mdxJsxAttribute', name: 'slug', value: 'my-recipe' },
            { type: 'mdxJsxAttribute', name: 'title', value: 'My Recipe' },
          ],
          children: [],
        });
      });
    });

    describe('case 2: with open and closing tags', () => {
      it('should transform a component with HTML content on same line', () => {
        const markdown = '<MyComponent><h2>Title</h2></MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
        });
        expect((mdxNodes[0] as Parent).children.length).toBeGreaterThan(0);
      });

      it('should transform a component with multi-line HTML content', () => {
        const markdown = `<MyComponent>
  <h2>Title</h2>
  <p>Content</p>
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
        });
      });

      it('should transform a component with attributes and content', () => {
        const markdown = '<MyComponent theme="info"><p>Hello</p></MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          attributes: [{ type: 'mdxJsxAttribute', name: 'theme', value: 'info' }],
        });
      });

      it('should transform inline component with spaces around content', () => {
        const markdown = '<MyComponent>   content with spaces   </MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
        });
      });

      it('should identify component after another component in the same line (parseSibling)', () => {
        const markdown = '<MyComponent>content</MyComponent><AnotherComponent />';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(2);
        const names = mdxNodes.map(n => (n as { name?: string }).name);
        expect(names).toContain('MyComponent');
        expect(names).toContain('AnotherComponent');
      });

      it('should transform a block component with markdown content', () => {
        const markdown = `<MyComponent>
Some **markdown** content
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', value: 'Some ' },
                { type: 'strong', children: [{ type: 'text', value: 'markdown' }] },
                { type: 'text', value: ' content' },
              ],
            },
          ],
        });
      });

      it('should transform a block component with multi-paragraph content', () => {
        const markdown = `<MyComponent>

First paragraph

Second paragraph
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          children: [
            { type: 'paragraph', children: [{ type: 'text', value: 'First paragraph' }] },
            { type: 'paragraph', children: [{ type: 'text', value: 'Second paragraph' }] },
          ],
        });
      });
    });

    describe('multiple components in combination', () => {
      it('should convert outer and nested components to mdxJsxFlowElement nodes', () => {
        const markdown = `
<MyComponent>
<NestedComponent>
  Hello
</NestedComponent>

<NestedComponent>
  Hello
</NestedComponent>
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        expect(tree.children[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          children: [
            {
              type: 'mdxJsxFlowElement',
              name: 'NestedComponent',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      value: 'Hello',
                    },
                  ],
                },
              ],
            },
            {
              type: 'mdxJsxFlowElement',
              name: 'NestedComponent',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      value: 'Hello',
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('should strip trailing newline from the last text node before the closing tag', () => {
        const markdown = `<Callout icon="📘" theme="info">
Hi

Hello
</Callout>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'Callout',
        });

        // The last paragraph inside the Callout should contain "Hello" without a trailing newline
        const calloutChildren = (mdxNodes[0] as Parent).children;
        const lastParagraph = calloutChildren[calloutChildren.length - 1] as Parent;
        expect(lastParagraph.type).toBe('paragraph');

        const textNodes = lastParagraph.children.filter((c: { type: string }) => c.type === 'text');
        const lastText = textNodes[textNodes.length - 1] as { value: string };
        expect(lastText.value).toBe('Hello');
      });

      it('should identify nested component that contains normal sibling content', () => {
        const markdown = `<MyComponent>
        <NestedComponent />
More content here
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        expect(tree.children[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          children: [
            {
              type: 'mdxJsxFlowElement',
              name: 'NestedComponent',
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  value: 'More content here',
                },
              ],
            },
          ],
        });
      });
    });

    describe('cases where it should not transform to mdx flow nodes', () => {
      it('should not transform tag without closing tag', () => {
        const markdown = '<MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(0);
      });

      it('should handle multiple components in same document', () => {
        const markdown = `<MyComponent />

<AnotherComponent>content</AnotherComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(2);
        expect(mdxNodes.map(n => (n as { name?: string }).name)).toContain('MyComponent');
        expect(mdxNodes.map(n => (n as { name?: string }).name)).toContain('AnotherComponent');
      });

      it('should not transform lowercase tags (non-component)', () => {
        const markdown = '<div>content</div>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(0);
      });
    });

    describe('case 3: embedded closing tag with trailing content', () => {
      it('should preserve content after the closing tag in an HTML sibling', () => {
        const markdown = `<Outer>

<Inner>first</Inner>

</Outer>
<Another>second</Another>`;
        const tree = parseWithPlugin(markdown);
        expect(tree.children).toMatchObject([
          {
            type: 'mdxJsxFlowElement',
            name: 'Outer',
            children: [
              {
                type: 'mdxJsxFlowElement',
                name: 'Inner',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'text', value: 'first' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'mdxJsxFlowElement',
            name: 'Another',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'second' }],
              },
            ],
          },
        ]);
      });

      it('should correctly handle repeated same-name components without blank line separation', () => {
        const markdown = `<Wrapper>

first content

</Wrapper>
<Wrapper>second content</Wrapper>`;
        const tree = parseWithPlugin(markdown);

        expect(tree.children).toMatchObject([
          {
            type: 'mdxJsxFlowElement',
            name: 'Wrapper',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'first content' }],
              },
            ],
          },
          {
            type: 'mdxJsxFlowElement',
            name: 'Wrapper',
            children: [{ type: 'paragraph', children: [{ type: 'text', value: 'second content' }] }],
          },
        ]);
      });

      it('should process a component opening tag found after a closing tag in the same HTML sibling', () => {
        const markdown = `<First>

hello

</First>
<Second />`;
        const tree = parseWithPlugin(markdown);

        expect(tree.children).toMatchObject([
          {
            type: 'mdxJsxFlowElement',
            name: 'First',
            children: [{ type: 'paragraph', children: [{ type: 'text', value: 'hello' }] }],
          },
          {
            type: 'mdxJsxFlowElement',
            name: 'Second',
            children: [],
          },
        ]);
      });
    });
  });

  describe('Anchor component (inline, excluded)', () => {
    it('should NOT convert <Anchor> to mdxJsxFlowElement', () => {
      // Anchor is an inline component and must remain as raw html nodes so that
      // the rendering path (rehypeRaw) can process it correctly inline in paragraphs.
      const markdown = '<Anchor href="https://readme.com">ReadMe</Anchor>';
      const tree = parseWithPlugin(markdown);

      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('should leave <Anchor> as raw html nodes inside a paragraph', () => {
      const markdown = 'Start by <Anchor href="https://readme.com" target="_blank">ReadMe</Anchor> today.';
      const tree = parseWithPlugin(markdown);

      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
      // The opening and closing tags stay as html nodes inside the paragraph
      const paragraphs = collectNodes<Parent>(tree, 'paragraph');
      expect(paragraphs).toHaveLength(1);
      const htmlNodes = paragraphs[0].children.filter(c => c.type === 'html');
      expect(htmlNodes.length).toBeGreaterThanOrEqual(2);
    });

    it('should still process other PascalCase components in the same document', () => {
      // Ensuring Anchor exclusion does not affect sibling components
      const markdown = `<Image src="test.png" alt="Test" />

Some text with <Anchor href="https://readme.com">link</Anchor> inline.`;
      const tree = parseWithPlugin(markdown);

      const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect((mdxNodes[0] as { name?: string }).name).toBe('Image');
    });
  });

  describe('inline PascalCase components', () => {
    it('promotes inline PascalCase to mdxJsxFlowElement (paragraph-parented)', () => {
      // Contract with mdxishInlineComponentBlocks: PascalCase is flow-level
      // even when authored inline, so this transformer owns the promotion
      // and the inline pass (lowercase-only) must not rewrite it.
      const markdown = 'before <MyComponent foo="bar" /> after';
      const tree = parseWithPlugin(markdown);

      expect(collectNodes(tree, 'mdxJsxTextElement')).toHaveLength(0);
      const mdxNodes = collectNodes(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'MyComponent',
        attributes: [{ type: 'mdxJsxAttribute', name: 'foo', value: 'bar' }],
      });
    });
  });

  describe('unclosed `<Tag>` opener does not swallow following blocks', () => {
    const counts = (tree: Root) => ({
      callouts: collectNodes(tree, 'rdme-callout').length,
      headings: tree.children.filter(c => c.type === 'heading').length,
      lists: collectNodes(tree, 'list').length,
      tables: collectNodes(tree, 'table').length,
      code: collectNodes(tree, 'code').length,
      mdxFlow: collectNodes(tree, 'mdxJsxFlowElement').length,
    });

    const calloutContains = (tree: Root, text: string, index = 0) => {
      const callouts = collectNodes<Parent>(tree, 'rdme-callout');
      return JSON.stringify(callouts[index]).includes(text);
    };

    describe('original repro', () => {
      it('parses both callouts when separated by `<Batch_id>_<File_Type>_<Version>.csv`', () => {
        const md = `> 📘 Success
>
> Vitae reprehenderit at aliquid error voluptates eum dignissimos.

<Batch_id>_<File_Type>_<Version>.csv

> 📘 Success
>
> Vitae reprehenderit at aliquid error voluptates eum dignissimos.
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(2);
      });

      it('still parses both callouts when the first tag is escaped (existing workaround)', () => {
        const md = `> 📘 Success
>
> Body one.

\\<Batch_id>_<File_Type>_<Version>.csv

> 📘 Success
>
> Body two.
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(2);
      });
    });

    describe('block-level siblings after an unclosed opener line', () => {
      it('preserves a following callout', () => {
        const md = `<Foo>_<Bar>.csv

> 📘 Heads up
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
        expect(calloutContains(tree, 'Heads up')).toBe(true);
        expect(calloutContains(tree, 'body')).toBe(true);
      });

      it('preserves a following ATX heading', () => {
        const md = `<Foo>_<Bar>.csv

# Real heading
`;
        const tree = parseMdxish(md);
        const headings = tree.children.filter(c => c.type === 'heading');
        expect(headings).toHaveLength(1);
        expect(headings[0]).toMatchObject({ depth: 1 });
      });

      it('preserves a following unordered list', () => {
        const md = `<Foo>_<Bar>.zip

- one
- two
- three
`;
        const tree = parseMdxish(md);
        const lists = collectNodes<Parent>(tree, 'list');
        expect(lists).toHaveLength(1);
        expect(lists[0].children).toHaveLength(3);
      });

      it('preserves a following fenced code block', () => {
        const md = `<Foo>_<Bar>.csv

\`\`\`js
const x = 1;
\`\`\`
`;
        const tree = parseMdxish(md);
        const code = collectNodes<Code>(tree, 'code');
        expect(code).toHaveLength(1);
        expect(code[0].lang).toBe('js');
        expect(code[0].value).toBe('const x = 1;');
      });

      it('preserves a following GFM table', () => {
        const md = `<Foo>_<Bar>.csv

| h1 | h2 |
| -- | -- |
| a  | b  |
`;
        const tree = parseMdxish(md);
        expect(counts(tree).tables).toBeGreaterThanOrEqual(1);
      });

      it('preserves a following real PascalCase component', () => {
        const md = `<Foo>_<Bar>.csv

<RealComponent foo="bar" />
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('RealComponent');
      });

      it('preserves multiple following blocks together', () => {
        const md = `<Outer>_<Inner>_<X>.csv

# Title

> 📘 Tip
>
> Body.

- item

\`\`\`
code
\`\`\`
`;
        const tree = parseMdxish(md);
        const c = counts(tree);
        expect(c.headings).toBe(1);
        expect(c.callouts).toBe(1);
        expect(c.lists).toBe(1);
        expect(c.code).toBe(1);
        expect(calloutContains(tree, 'Tip')).toBe(true);
        expect(calloutContains(tree, 'Body.')).toBe(true);
      });
    });

    describe('multiple unclosed openers in series', () => {
      it('does not swallow subsequent callouts when several broken lines appear', () => {
        const md = `<Alpha>_<Beta>.csv

<Gamma>_<Delta>.csv

> 📘 Survives
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });
    });

    describe('nested inside containers', () => {
      it('does not swallow content inside the same callout as the broken line', () => {
        const md = `> 📘 Title
>
> intro
>
> <Foo>_<Bar>.csv
>
> trailing line still inside
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
        const callouts = collectNodes<Parent>(tree, 'rdme-callout');
        const text = JSON.stringify(callouts[0]);
        expect(text).toContain('trailing line still inside');
      });

      it('parses a callout that follows a broken line, both inside a list item', () => {
        const md = `- top item

  <Foo>_<Bar>.csv

  > 📘 inside list
  >
  > body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
        expect(calloutContains(tree, 'inside list')).toBe(true);
        expect(calloutContains(tree, 'body')).toBe(true);
      });

      it('preserves headings nested under a broken line in document order', () => {
        const md = `<A>_<B>.csv

## Heading two

text
`;
        const tree = parseMdxish(md);
        const headings = tree.children.filter((c): c is Heading => c.type === 'heading');
        expect(headings).toHaveLength(1);
        expect(headings[0].depth).toBe(2);
      });

      it('keeps a broken line inside a heading from breaking the next callout', () => {
        const md = `# Heading with <Foo>_<Bar> noise

> 📘 Tip
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).headings).toBe(1);
        expect(counts(tree).callouts).toBe(1);
        expect(calloutContains(tree, 'Tip')).toBe(true);
        expect(calloutContains(tree, 'body')).toBe(true);
      });
    });

    describe('non-regression — real component shapes still parse', () => {
      it('still parses a standard multi-line `<Outer>…</Outer>` block', () => {
        const md = `<Outer>

inside

</Outer>

> 📘 After
>
> body
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('Outer');
        expect(counts(tree).callouts).toBe(1);
      });

      it('still parses a single-line `<Foo>text</Foo>` block', () => {
        const md = `<Foo>hello</Foo>

> 📘 After
>
> body
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('Foo');
        expect(counts(tree).callouts).toBe(1);
      });

      it('still parses a self-closing `<Foo />` followed by a callout', () => {
        const md = `<Foo />

> 📘 After
>
> body
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('Foo');
        expect(counts(tree).callouts).toBe(1);
      });

      it('still parses nested same-name components when properly closed', () => {
        const md = `<Outer>

<Outer>inner</Outer>

</Outer>

> 📘 After
>
> body
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.filter(n => n.name === 'Outer')).toHaveLength(2);
        expect(counts(tree).callouts).toBe(1);
      });

      it('parses `<Callout>Hello\\n</Callout>` (plain content, closer next line)', () => {
        const md = `<Callout>Hello
</Callout>
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('Callout');
      });

      it('parses `<Callout>first\\n\\nsecond\\n</Callout>` (multi-paragraph body)', () => {
        const md = `<Callout>First paragraph.

Second paragraph
</Callout>
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('Callout');
      });

      it('parses `<Callout>x <strong>y</strong>\\n</Callout>` (matched inline tag on opener line)', () => {
        const md = `<Callout>Hello <strong>Hello</strong>
</Callout>
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('Callout');
      });

      it('parses nested `<Callout>` with inline tag and multi-paragraph body', () => {
        const md = `<Callout>First paragraph.

<Callout>Hello <strong>Hello</strong>
</Callout>

Second paragraph
</Callout>
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.filter(n => n.name === 'Callout')).toHaveLength(2);
      });
    });

    describe('inside real PascalCase parent components', () => {
      it('parses a callout sibling when the broken line is inside a real outer component', () => {
        const md = `<Outer>

<Foo>_<Bar>.csv

> 📘 Inside Outer
>
> body

</Outer>
`;
        const tree = parseMdxish(md);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        const outer = flow.find(n => n.name === 'Outer');
        expect(outer).toBeDefined();
        const calloutsInside = collectNodes(outer as Parent, 'rdme-callout');
        expect(calloutsInside).toHaveLength(1);
      });

      it('parses a callout immediately after a real outer component closes', () => {
        const md = `<Outer>

<Foo>_<Bar>.csv

</Outer>

> 📘 After outer
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
        const flow = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
        expect(flow.map(n => n.name)).toContain('Outer');
      });
    });

    describe('stress scenarios', () => {
      it('handles a long document littered with broken opener lines and real callouts', () => {
        const md = `# Top

<A>_<B>.csv

> 📘 One
>
> body

<C>_<D>.zip

> 📘 Two
>
> body

<E>_<F>.tar

> 📘 Three
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(3);
        expect(counts(tree).headings).toBe(1);
        expect(calloutContains(tree, 'One', 0)).toBe(true);
        expect(calloutContains(tree, 'Two', 1)).toBe(true);
        expect(calloutContains(tree, 'Three', 2)).toBe(true);
      });

      it('does not consume the only callout when the opener uses a real component-style name', () => {
        const md = `<Image>_<source>.png

> 📘 After
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });

      it('handles an indented broken line followed by a callout', () => {
        const md = `   <Foo>_<Bar>.csv

> 📘 After indent
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });

      it('does not crash and parses callout when document ends mid-broken-opener', () => {
        const md = `> 📘 First
>
> body

<Trailing>_<Unclosed>`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });

      it('parses both callouts when the broken line is in a deeply nested list item', () => {
        const md = `- top
  - nested
    - <Foo>_<Bar>.csv

> 📘 After deep list
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });

      it('survives multiple consecutive broken lines without a blank between', () => {
        const md = `<A>_<B>.csv
<C>_<D>.zip
<E>_<F>.tar

> 📘 After three
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });
    });

    describe('whitespace and adjacency variants', () => {
      it('survives when the callout follows immediately with no blank line', () => {
        const md = `<Foo>_<Bar>.csv
> 📘 Tight
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });

      it('survives when the broken opener has trailing whitespace', () => {
        const md = `<Foo>_<Bar>.csv   ${''}

> 📘 Trailing whitespace
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });

      it('survives when the broken opener has a tab between filename tokens', () => {
        const md = `<Foo>\t_<Bar>.csv

> 📘 Tab after
>
> body
`;
        const tree = parseMdxish(md);
        expect(counts(tree).callouts).toBe(1);
      });
    });
  });
});
