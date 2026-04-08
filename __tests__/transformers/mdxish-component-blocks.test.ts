import type { Parent, Root } from 'mdast';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { mdxComponentFromMarkdown } from '../../lib/mdast-util/mdx-component';
import { mdxComponent } from '../../lib/micromark/mdx-component';
import mdxishComponentBlocks, { parseAttributes, parseTag } from '../../processor/transform/mdxish/mdxish-component-blocks';
import mdxishSelfClosingBlocks from '../../processor/transform/mdxish/mdxish-self-closing-blocks';

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

/**
 * Helper to find nodes by type in the tree.
 */
const findNodesByType = (tree: Parent, type: string): Parent[] => {
  const results: Parent[] = [];
  const stack = [tree];

  while (stack.length) {
    const node = stack.pop()!;
    if (node.type === type) {
      results.push(node);
    }
    if ('children' in node && Array.isArray(node.children)) {
      stack.push(...(node.children as Parent[]));
    }
  }

  return results;
};

describe('mdxish-component-blocks', () => {
  describe('parseTag', () => {
    it('should parse a self-closing tag with attributes', () => {
      const result = parseTag('<MyComponent theme="dark" size="large" />');

      expect(result?.tag).toBe('MyComponent');
      expect(result?.selfClosing).toBe(true);
      expect(result?.contentAfterTag).toBe('');
      expect(result?.attrString.trim()).toBe('theme="dark" size="large"');
    });

    it('should parse an opening tag with content after it', () => {
      const result = parseTag('<Callout theme="info">Some content</Callout>');
      expect(result?.tag).toBe('Callout');
      expect(result?.selfClosing).toBe(false);
      expect(result?.contentAfterTag).toBe('Some content</Callout>');
      expect(result?.attrString.trim()).toBe('theme="info"');
    });

    it('should return null for lowercase (non-component) tags', () => {
      expect(parseTag('<div class="foo">')).toBeNull();
    });

    it('should parse a tag whose quoted attribute contains >', () => {
      const result = parseTag('<Image caption="A > B" />');
      expect(result?.tag).toBe('Image');
      expect(result?.attrString.trim()).toBe('caption="A > B"');
    });

    it('should parse multilline attributes', () => {
      const result = parseTag(`<Image
  src="https://example.com/image.jpg"
  alt="Some helpful text"
  border
/>`);
      expect(result?.tag).toBe('Image');
      expect(result?.attrString).toBe(`
  src="https://example.com/image.jpg"
  alt="Some helpful text"
  border
`);
    });
  })

  describe('parseAttributes', () => {
    describe('normal quoted attributes ""', () => {
      it('should parse multiple attributes', () => {
        const attrString = 'attr1="value1" attr2="value2"';
        const result = parseAttributes(attrString);

        expect(result).toStrictEqual([{
          type: 'mdxJsxAttribute',
          name: 'attr1',
          value: 'value1',
        },
        {
          type: 'mdxJsxAttribute',
          name: 'attr2',
          value: 'value2',
        }]);
      });

      it('should not break when there are special characters in the attribute value', () => {
        const attrString = 'attr1="!@#$%^&*()_+"';
        const result = parseAttributes(attrString);

        expect(result).toStrictEqual([{
          type: 'mdxJsxAttribute',
          name: 'attr1',
          value: '!@#$%^&*()_+',
        }]);
      });
    });

    describe('template literal attributes', () => {
      it('should parse template literal attributes as raw brace expressions', () => {
        const attrString = 'attr1={`value1`} attr2={`value2`}';
        const result = parseAttributes(attrString);

        expect(result).toStrictEqual([{
          type: 'mdxJsxAttribute',
          name: 'attr1',
          value: '{`value1`}',
        }, {
          type: 'mdxJsxAttribute',
          name: 'attr2',
          value: '{`value2`}',
        }]);
      });
    });

    describe('unquoted attributes', () => {
      it('should parse unquoted attributes', () => {
        const attrString = 'attr1=value1 attr2=value2';
        const result = parseAttributes(attrString);

        expect(result).toStrictEqual([{
          type: 'mdxJsxAttribute',
          name: 'attr1',
          value: 'value1',
        }, {
          type: 'mdxJsxAttribute',
          name: 'attr2',
          value: 'value2',
        }]);
      });

      it('should not break when there are special characters in the attribute value', () => {
        const attrString = 'attr1=!@#$%^&*()_+';
        const result = parseAttributes(attrString);

        expect(result).toStrictEqual([{
          type: 'mdxJsxAttribute',
          name: 'attr1',
          value: '!@#$%^&*()_+',
        }]);
      });

      it('should not break when there is / character in the value', () => {
        const attrString = 'attr1=https://example.com';
        const result = parseAttributes(attrString);

        expect(result).toStrictEqual([{
          type: 'mdxJsxAttribute',
          name: 'attr1',
          value: 'https://example.com',
        }]);
      });
    });

    it('should parse boolean attributes without values', () => {
      const attrString = 'empty';
      const result = parseAttributes(attrString);

      expect(result).toStrictEqual([{
        type: 'mdxJsxAttribute',
        name: 'empty',
        value: null,
      }]);
    });
  });

  describe('mdxishComponentBlocks plugin', () => {
    describe('Case 1: Self-closing tags', () => {
      it('should transform a simple self-closing tag', () => {
        const markdown = '<MyComponent />';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
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

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
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

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
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

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
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

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
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

    describe('Case 2: Self-contained blocks', () => {
      it('should transform a component with HTML content on same line', () => {
        const markdown = '<MyComponent><h2>Title</h2></MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
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

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
        });
      });

      it('should transform a component with attributes and content', () => {
        const markdown = '<MyComponent theme="info"><p>Hello</p></MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
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

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
        });
      });

      it('should identify component after another component in the same line (parseSibling)', () => {
        const markdown = '<MyComponent>content</MyComponent><AnotherComponent />';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(2);
        const names = mdxNodes.map(n => (n as { name?: string }).name);
        expect(names).toContain('MyComponent');
        expect(names).toContain('AnotherComponent');
      });
    });

    describe('Case 3: Multi-line components', () => {
      it('should transform a block component with markdown content', () => {
        const markdown = `<MyComponent>
Some **markdown** content
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
        });
      });

      it('should transform a block component with multi-paragraph content', () => {
        const markdown = `<MyComponent>

First paragraph

Second paragraph
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
      });

      it('should transform a block component with attributes', () => {
        const markdown = `<MyComponent theme="warning">
Alert content here
</MyComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
          attributes: [{ type: 'mdxJsxAttribute', name: 'theme', value: 'warning' }],
        });
      });

      describe('nested components', () => {
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

          const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
          expect(mdxNodes).toHaveLength(3);
          expect(mdxNodes[0]).toMatchObject({
            type: 'mdxJsxFlowElement',
            name: 'MyComponent',
          });
          expect(mdxNodes[1]).toMatchObject({
            type: 'mdxJsxFlowElement',
            name: 'NestedComponent',
          });
          expect(mdxNodes[2]).toMatchObject({
            type: 'mdxJsxFlowElement',
            name: 'NestedComponent',
          });
        });
      });

      it('should strip trailing newline from the last text node before the closing tag', () => {
        const markdown = `<Callout icon="📘" theme="info">
Hi

Hello
</Callout>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'Callout',
        });

        // The last paragraph inside the Callout should contain "Hello" without a trailing newline
        const calloutChildren = mdxNodes[0].children;
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

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(2);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
        });
        const foundNestedComponent = mdxNodes[0].children.some(child => {
          return child.type === 'mdxJsxFlowElement' && (child as { name?: string }).name === 'NestedComponent';
        });
        expect(foundNestedComponent).toBe(true);
      });
    });

    describe('Integration cases', () => {
      it('should not transform tag without closing tag', () => {
        const markdown = '<MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(0);
      });

      it('should handle multiple components in same document', () => {
        const markdown = `<MyComponent />

<AnotherComponent>content</AnotherComponent>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(2);
        expect(mdxNodes.map(n => (n as { name?: string }).name)).toContain('MyComponent');
        expect(mdxNodes.map(n => (n as { name?: string }).name)).toContain('AnotherComponent');
      });

      it('should not transform lowercase tags (non-component)', () => {
        const markdown = '<div>content</div>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(0);
      });
    });

    describe('Case 3: embedded closing tag with trailing content', () => {
      it('should preserve content after the closing tag in an HTML sibling', () => {
        const markdown = `<Outer>

<Inner>first</Inner>

</Outer>
<Another>second</Another>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        const names = mdxNodes.map(n => (n as { name?: string }).name);
        expect(names).toContain('Outer');
        expect(names).toContain('Inner');
        expect(names).toContain('Another');
      });

      it('should correctly handle repeated same-name components without blank line separation', () => {
        const markdown = `<Wrapper>

first content

</Wrapper>
<Wrapper>second content</Wrapper>`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        const wrapperNodes = mdxNodes.filter(n => (n as { name?: string }).name === 'Wrapper');
        expect(wrapperNodes).toHaveLength(2);
      });

      it('should process a component opening tag found after a closing tag in the same HTML sibling', () => {
        const markdown = `<First>

hello

</First>
<Second />`;
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        const names = mdxNodes.map(n => (n as { name?: string }).name);
        expect(names).toContain('First');
        expect(names).toContain('Second');
      });
    });
  });

  describe('attributes containing > character', () => {
    it('should parse a self-closing tag whose attribute value contains >', () => {
      const markdown = '<Image src="test.png" caption="Settings > Health Check" />';
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Image',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'src', value: 'test.png' },
          { type: 'mdxJsxAttribute', name: 'caption', value: 'Settings > Health Check' },
        ],
        children: [],
      });
    });

    it('should parse a block component whose attribute value contains >', () => {
      const markdown = `<Callout title="A > B">
Some content
</Callout>`;
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Callout',
        attributes: [{ type: 'mdxJsxAttribute', name: 'title', value: 'A > B' }],
      });
    });

    it('should parse a self-contained component whose attribute value contains >', () => {
      const markdown = "<MyComponent label='foo > bar'>content</MyComponent>";
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'MyComponent',
        attributes: [{ type: 'mdxJsxAttribute', name: 'label', value: 'foo > bar' }],
      });
    });

    it('should handle multiple attributes where one contains >', () => {
      const markdown = '<Widget theme="dark" path="A > B > C" size="large" />';
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Widget',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'theme', value: 'dark' },
          { type: 'mdxJsxAttribute', name: 'path', value: 'A > B > C' },
          { type: 'mdxJsxAttribute', name: 'size', value: 'large' },
        ],
        children: [],
      });
    });

    it('should handle consecutive >> in attribute value', () => {
      const markdown = '<Image caption="A >> B >>> C" />';
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Image',
        attributes: [{ type: 'mdxJsxAttribute', name: 'caption', value: 'A >> B >>> C' }],
      });
    });

    it('should handle > as the entire attribute value', () => {
      const markdown = '<Image caption=">" />';
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Image',
        attributes: [{ type: 'mdxJsxAttribute', name: 'caption', value: '>' }],
      });
    });

    it('should handle > in both single and double-quoted attributes on the same tag', () => {
      const markdown = '<Widget title="A > B" subtitle=\'C > D\' />';
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Widget',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'title', value: 'A > B' },
          { type: 'mdxJsxAttribute', name: 'subtitle', value: 'C > D' },
        ],
      });
    });

    it('should handle < alongside > inside a quoted attribute', () => {
      const markdown = '<Image caption="a < b > c" />';
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Image',
        attributes: [{ type: 'mdxJsxAttribute', name: 'caption', value: 'a < b > c' }],
      });
    });

    it('should handle > with a boolean attribute after it', () => {
      const markdown = '<Image caption="A > B" border />';
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect(mdxNodes[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: 'Image',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'caption', value: 'A > B' },
          { type: 'mdxJsxAttribute', name: 'border', value: null },
        ],
      });
    });

    it('should handle nested component with > in outer attribute', () => {
      const markdown = `<Outer label="X > Y">
  <Inner>content</Inner>
</Outer>`;
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      const outer = mdxNodes.find(n => (n as { name?: string }).name === 'Outer');
      expect(outer).toBeDefined();
      expect(outer).toMatchObject({
        attributes: [{ type: 'mdxJsxAttribute', name: 'label', value: 'X > Y' }],
      });
    });
  });

  describe('Anchor component (inline, excluded)', () => {
    it('should NOT convert <Anchor> to mdxJsxFlowElement', () => {
      // Anchor is an inline component and must remain as raw html nodes so that
      // the rendering path (rehypeRaw) can process it correctly inline in paragraphs.
      const markdown = '<Anchor href="https://readme.com">ReadMe</Anchor>';
      const tree = parseWithPlugin(markdown);

      expect(findNodesByType(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('should leave <Anchor> as raw html nodes inside a paragraph', () => {
      const markdown = 'Start by <Anchor href="https://readme.com" target="_blank">ReadMe</Anchor> today.';
      const tree = parseWithPlugin(markdown);

      expect(findNodesByType(tree, 'mdxJsxFlowElement')).toHaveLength(0);
      // The opening and closing tags stay as html nodes inside the paragraph
      const paragraphs = findNodesByType(tree, 'paragraph');
      expect(paragraphs).toHaveLength(1);
      const htmlNodes = paragraphs[0].children.filter((c: { type: string }) => c.type === 'html');
      expect(htmlNodes.length).toBeGreaterThanOrEqual(2);
    });

    it('should still process other PascalCase components in the same document', () => {
      // Ensuring Anchor exclusion does not affect sibling components
      const markdown = `<Image src="test.png" alt="Test" />

Some text with <Anchor href="https://readme.com">link</Anchor> inline.`;
      const tree = parseWithPlugin(markdown);

      const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
      expect(mdxNodes).toHaveLength(1);
      expect((mdxNodes[0] as { name?: string }).name).toBe('Image');
    });
  });

});

