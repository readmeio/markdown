import type { Parent, Root } from 'mdast';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import mdxishComponentBlocks, { parseAttributes } from '../../processor/transform/mdxish/mdxish-component-blocks';

/**
 * Helper to parse markdown and apply only the mdxishComponentBlocks plugin.
 * This isolates the plugin from the full mdxish pipeline.
 */
const parseWithPlugin = (markdown: string): Root => {
  const processor = unified().use(remarkParse).use(mdxishComponentBlocks);
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
  describe('parseAttributes', () => {
    it('should parse normal key-value attributes', () => {
      const attrString = 'theme="info"';
      const result = parseAttributes(attrString);

      expect(result).toHaveLength(1);
      expect(result[0]).toStrictEqual({
        type: 'mdxJsxAttribute',
        name: 'theme',
        value: 'info',
      });
    });

    it('should parse boolean attributes without values', () => {
      const attrString = 'theme="info" empty';
      const result = parseAttributes(attrString);

      expect(result).toHaveLength(2);
      expect(result[0]).toStrictEqual({
        type: 'mdxJsxAttribute',
        name: 'theme',
        value: 'info',
      });
      expect(result[1]).toStrictEqual({
        type: 'mdxJsxAttribute',
        name: 'empty',
        value: null,
      });
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
    });

    describe('Case 3: Inline components', () => {
      it('should transform inline component with text content', () => {
        const markdown = '<MyComponent>Click me</MyComponent>';
        const tree = parseWithPlugin(markdown);

        const mdxNodes = findNodesByType(tree, 'mdxJsxFlowElement');
        expect(mdxNodes).toHaveLength(1);
        expect(mdxNodes[0]).toMatchObject({
          type: 'mdxJsxFlowElement',
          name: 'MyComponent',
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
    });

    describe('Case 4: Block components', () => {
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
        it('should convert outer component to mdxJsxFlowElement when nested component are separated by newlines', () => {
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
          expect(mdxNodes).toHaveLength(1);
          expect(mdxNodes[0]).toMatchObject({
            type: 'mdxJsxFlowElement',
            name: 'MyComponent',
          });
        });
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
  });
});
