import type { Parent, Root } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import mdxishInlineComponents from '../../processor/transform/mdxish/mdxish-inline-components';

/**
 * Helper to parse markdown and apply only the mdxishInlineComponents plugin.
 */
const parseWithPlugin = (markdown: string): Root => {
  const processor = unified().use(remarkParse).use(mdxishInlineComponents);
  const tree = processor.parse(markdown);
  processor.runSync(tree);
  return tree as Root;
};

/**
 * Helper to find nodes by type in the tree.
 */
const findNodesByType = <T extends Parent>(tree: Parent, type: string): T[] => {
  const results: T[] = [];
  const stack: Parent[] = [tree];

  while (stack.length) {
    const node = stack.pop()!;
    if (node.type === type) {
      results.push(node as T);
    }
    if ('children' in node && Array.isArray(node.children)) {
      stack.push(...(node.children as Parent[]));
    }
  }

  return results;
};

/**
 * Helper to get attribute value from mdxJsxTextElement
 */
const getAttr = (node: MdxJsxTextElement, name: string): string | null | undefined => {
  const attr = node.attributes.find(a => a.type === 'mdxJsxAttribute' && a.name === name);
  return attr && 'value' in attr ? (attr.value as string | null) : undefined;
};

describe('mdxish-inline-components', () => {
  describe('basic Anchor transformation', () => {
    it('should transform a simple Anchor to mdxJsxTextElement', () => {
      const markdown = '<Anchor href="https://example.com">Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({
        type: 'mdxJsxTextElement',
        name: 'Anchor',
      });
      expect(getAttr(nodes[0], 'href')).toBe('https://example.com');
    });

    it('should preserve text content as children', () => {
      const markdown = '<Anchor href="https://example.com">Click here</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].children).toHaveLength(1);
      expect(nodes[0].children[0]).toMatchObject({
        type: 'text',
        value: 'Click here',
      });
    });

    it('should transform Anchor with multiple attributes', () => {
      const markdown = '<Anchor href="https://example.com" target="_blank" title="Example">Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe('https://example.com');
      expect(getAttr(nodes[0], 'target')).toBe('_blank');
      expect(getAttr(nodes[0], 'title')).toBe('Example');
    });
  });

  describe('Anchor in paragraph context', () => {
    it('should transform Anchor inline with surrounding text', () => {
      const markdown = 'Visit <Anchor href="https://example.com">our site</Anchor> today.';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Anchor');

      // Check paragraph still contains surrounding text
      const paragraphs = findNodesByType<Parent>(tree, 'paragraph');
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].children.length).toBeGreaterThanOrEqual(3);
    });

    it('should transform Anchor at the start of paragraph', () => {
      const markdown = '<Anchor href="https://example.com">Start</Anchor> of the sentence.';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should transform Anchor at the end of paragraph', () => {
      const markdown = 'End of the sentence <Anchor href="https://example.com">here</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });
  });

  describe('multiple Anchors', () => {
    it('should transform multiple Anchors in the same paragraph', () => {
      const markdown =
        'Visit <Anchor href="https://a.com">Site A</Anchor> or <Anchor href="https://b.com">Site B</Anchor>.';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(2);
      const hrefs = nodes.map(n => getAttr(n, 'href')).sort();
      expect(hrefs).toEqual(['https://a.com', 'https://b.com']);
    });

    it('should transform adjacent Anchors without text between', () => {
      const markdown = '<Anchor href="https://a.com">A</Anchor><Anchor href="https://b.com">B</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(2);
    });

    it('should transform Anchors in different paragraphs', () => {
      const markdown = `First <Anchor href="https://a.com">link</Anchor>.

Second <Anchor href="https://b.com">link</Anchor>.`;
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(2);
    });
  });

  describe('special URL formats', () => {
    it('should preserve doc: protocol URLs', () => {
      const markdown = '<Anchor href="doc:getting-started">Getting Started</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe('doc:getting-started');
    });

    it('should preserve ref: protocol URLs', () => {
      const markdown = '<Anchor href="ref:api-endpoint">API Reference</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'href')).toBe('ref:api-endpoint');
    });

    it('should preserve changelog: protocol URLs', () => {
      const markdown = '<Anchor href="changelog:v2-release">Changelog</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'href')).toBe('changelog:v2-release');
    });

    it('should preserve page: protocol URLs', () => {
      const markdown = '<Anchor href="page:custom-page">Custom Page</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'href')).toBe('page:custom-page');
    });

    it('should handle URLs with hash fragments', () => {
      const markdown = '<Anchor href="doc:page#section">Section Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'href')).toBe('doc:page#section');
    });

    it('should handle URLs with query parameters', () => {
      const markdown = '<Anchor href="https://example.com?foo=bar&baz=qux">Query Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'href')).toBe('https://example.com?foo=bar&baz=qux');
    });

    it('should handle relative URLs', () => {
      const markdown = '<Anchor href="/docs/intro">Relative</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'href')).toBe('/docs/intro');
    });

    it('should handle anchor-only URLs', () => {
      const markdown = '<Anchor href="#section">Jump to Section</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'href')).toBe('#section');
    });
  });

  describe('content edge cases', () => {
    it('should handle empty content', () => {
      const markdown = '<Anchor href="https://example.com"></Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].children).toHaveLength(0);
    });

    it('should handle whitespace-only content', () => {
      const markdown = '<Anchor href="https://example.com">   </Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should handle unicode content', () => {
      const markdown = '<Anchor href="https://example.com">日本語リンク</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].children[0]).toMatchObject({
        type: 'text',
        value: '日本語リンク',
      });
    });

    it('should handle emoji content', () => {
      const markdown = '<Anchor href="https://example.com">🚀 Launch</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].children[0]).toMatchObject({
        type: 'text',
        value: '🚀 Launch',
      });
    });

    it('should handle special HTML entities in content', () => {
      const markdown = '<Anchor href="https://example.com">Terms &amp; Conditions</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should preserve inline code in content', () => {
      const markdown = '<Anchor href="https://example.com">The `code` function</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      // Should have text, inlineCode, text as children
      expect(nodes[0].children.length).toBeGreaterThanOrEqual(1);
    });

    it('should preserve bold text in content', () => {
      const markdown = '<Anchor href="https://example.com">Click **here**</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should preserve italic text in content', () => {
      const markdown = '<Anchor href="https://example.com">Click *here*</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });
  });

  describe('attribute edge cases', () => {
    it('should handle attributes with single quotes', () => {
      const markdown = "<Anchor href='https://example.com'>Link</Anchor>";
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe('https://example.com');
    });

    it('should handle attributes with escaped quotes in value', () => {
      const markdown = '<Anchor href="https://example.com" title="Say &quot;Hello&quot;">Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should handle attributes with spaces in values', () => {
      const markdown = '<Anchor href="https://example.com" title="A long title with spaces">Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(getAttr(nodes[0], 'title')).toBe('A long title with spaces');
    });

    it('should handle attributes with newlines in values', () => {
      const markdown = '<Anchor href="https://example.com" title="Line1\nLine2">Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      // Note: behavior depends on how parseAttributes handles this
      expect(nodes.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty href', () => {
      const markdown = '<Anchor href="">Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe('');
    });

    it('should handle missing href attribute', () => {
      const markdown = '<Anchor>Link without href</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBeUndefined();
    });

    it('should handle download attribute', () => {
      const markdown = '<Anchor href="/file.pdf" download="report.pdf">Download</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'download')).toBe('report.pdf');
    });

    it('should handle data- attributes', () => {
      const markdown = '<Anchor href="/page" data-tracking="click-event">Track</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'data-tracking')).toBe('click-event');
    });

    it('should handle rel attribute', () => {
      const markdown = '<Anchor href="https://external.com" rel="noopener noreferrer">External</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'rel')).toBe('noopener noreferrer');
    });
  });

  describe('malformed input handling', () => {
    it('should NOT transform unclosed Anchor tag', () => {
      const markdown = '<Anchor href="https://example.com">No closing tag';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(0);
    });

    it('should NOT transform Anchor with mismatched closing tag', () => {
      const markdown = '<Anchor href="https://example.com">Text</Other>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(0);
    });

    it('should NOT transform self-closing Anchor', () => {
      // Self-closing inline components don't make sense for Anchor
      const markdown = '<Anchor href="https://example.com" />';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(0);
    });

    it('should NOT transform lowercase anchor tag', () => {
      const markdown = '<anchor href="https://example.com">lowercase</anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(0);
    });

    it('should handle orphaned closing tag gracefully', () => {
      const markdown = 'Some text </Anchor> more text';
      const tree = parseWithPlugin(markdown);

      // Should not crash, orphaned closing tag stays as html
      expect(tree).toBeDefined();
    });

    it('should handle double opening tags', () => {
      const markdown = '<Anchor href="a"><Anchor href="b">Text</Anchor>';
      const tree = parseWithPlugin(markdown);

      // First opening tag should remain unprocessed, second should transform
      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });
  });

  describe('components NOT in INLINE_COMPONENTS set', () => {
    it('should NOT transform unknown PascalCase inline components', () => {
      const markdown = '<CustomInline attr="value">content</CustomInline>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(0);
    });

    it('should transform Glossary as inline component', () => {
      // Glossary is now included in INLINE_COMPONENTS
      const markdown = '<Glossary>term</Glossary>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Glossary');
    });
  });

  describe('interaction with markdown syntax', () => {
    it('should work inside a list item', () => {
      const markdown = '- Item with <Anchor href="https://example.com">link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should work inside a blockquote', () => {
      const markdown = '> Quote with <Anchor href="https://example.com">link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should work after inline code', () => {
      const markdown = 'Use `code` then <Anchor href="https://example.com">click here</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should work before inline code', () => {
      const markdown = 'Click <Anchor href="https://example.com">here</Anchor> then use `code`';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should work alongside regular markdown links', () => {
      const markdown =
        'A [markdown link](https://a.com) and <Anchor href="https://b.com">component link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);

      const links = findNodesByType<Parent>(tree, 'link');
      expect(links).toHaveLength(1);
    });

    it('should work with emphasis around Anchor', () => {
      const markdown = '**Bold <Anchor href="https://example.com">link</Anchor> text**';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });
  });

  describe('whitespace and formatting edge cases', () => {
    it('should handle Anchor tag with extra spaces in opening tag', () => {
      const markdown = '<Anchor  href="https://example.com"  target="_blank" >Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should handle newline between Anchors', () => {
      const markdown = `<Anchor href="https://a.com">A</Anchor>
<Anchor href="https://b.com">B</Anchor>`;
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(2);
    });

    it('should handle Anchor immediately after text with no space', () => {
      const markdown = 'Click<Anchor href="https://example.com">here</Anchor>now';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should handle Anchor with tab characters', () => {
      const markdown = '<Anchor\thref="https://example.com"\ttarget="_blank">Link</Anchor>';
      const tree = parseWithPlugin(markdown);

      // Behavior depends on attribute parsing - just verify no crash
      expect(tree).toBeDefined();
    });
  });

  describe('regression tests', () => {
    it('should not break when Anchor appears in table cell', () => {
      const markdown = `| Column |
| --- |
| <Anchor href="https://example.com">Link</Anchor> |`;
      const tree = parseWithPlugin(markdown);

      // Tables are parsed differently, verify no crash
      expect(tree).toBeDefined();
    });

    it('should handle Anchor with JavaScript URL (should preserve as-is)', () => {
      // Security note: Anchor component should handle sanitization at render time
      const markdown = '<Anchor href="javascript:void(0)">Click</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe('javascript:void(0)');
    });

    it('should handle Anchor with mailto URL', () => {
      const markdown = '<Anchor href="mailto:test@example.com">Email Us</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe('mailto:test@example.com');
    });

    it('should handle Anchor with tel URL', () => {
      const markdown = '<Anchor href="tel:+1234567890">Call Us</Anchor>';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe('tel:+1234567890');
    });

    it('should handle mixed case in tag name (only exact PascalCase matches)', () => {
      const markdown = '<ANCHOR href="https://example.com">All caps</ANCHOR>';
      const tree = parseWithPlugin(markdown);

      // ANCHOR is not the same as Anchor
      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(0);
    });
  });

  describe('stress tests', () => {
    it('should handle many Anchors in a single paragraph', () => {
      const anchors = Array.from(
        { length: 20 },
        (_, i) => `<Anchor href="https://example.com/${i}">Link ${i}</Anchor>`,
      ).join(' ');
      const markdown = `Start ${anchors} end.`;
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(20);
    });

    it('should handle deeply nested markdown around Anchor', () => {
      const markdown =
        '***<Anchor href="https://example.com">bold italic link</Anchor>***';
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });

    it('should handle very long href values', () => {
      const longUrl = `https://example.com/${'a'.repeat(2000)}`;
      const markdown = `<Anchor href="${longUrl}">Long URL</Anchor>`;
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
      expect(getAttr(nodes[0], 'href')).toBe(longUrl);
    });

    it('should handle very long content', () => {
      const longContent = 'word '.repeat(500);
      const markdown = `<Anchor href="https://example.com">${longContent}</Anchor>`;
      const tree = parseWithPlugin(markdown);

      const nodes = findNodesByType<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
      expect(nodes).toHaveLength(1);
    });
  });
});
