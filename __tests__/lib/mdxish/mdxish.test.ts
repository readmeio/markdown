import type { Element, Root, RootContent } from 'hast';

import { visit } from 'unist-util-visit';

import { mdxish, mdxishAstProcessor } from '../../../lib/mdxish';
import { extractText } from '../../../processor/transform/extract-text';

type HastNode = Root | RootContent;

/**
 * Recursively finds an element with the specified tagName in a HAST tree.
 */
function findElementByTagName(node: HastNode, tagName: string): Element | null {
  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    return node;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.reduce<Element | null>((found, child) => {
      if (found) return found;
      return findElementByTagName(child, tagName);
    }, null);
  }
  return null;
}

/**
 * Finds all heading elements in a HAST tree and returns their tagName and id.
 */
function findAllHeadings(tree: Root): { id: string; tagName: string }[] {
  const headings: { id: string; tagName: string }[] = [];
  visit(tree, 'element', (node: Element) => {
    if (/^h[1-6]$/.test(node.tagName) && node.properties?.id) {
      headings.push({ id: String(node.properties.id), tagName: node.tagName });
    }
  });
  return headings;
}

describe('mdxish should render', () => {
  describe('invalid mdx syntax', () => {
    it('should render unclosed tags', () => {
      const md = '<br>';
      expect(() => mdxish(md)).not.toThrow();
    });

    it('should render unclosed curly braces', () => {
      const md1 = 'Hello {user.name';
      expect(() => mdxish(md1)).not.toThrow();
      const md2 = 'This is an api: /param1/{param2 that has a unclosed curly brace';
      expect(() => mdxish(md2)).not.toThrow();
    });
  });

  it('should render content in new lines', () => {
    const md = `<div>hello
</div>`;
    expect(() => mdxish(md)).not.toThrow();
  });

  describe('should handle just ">"', () => {
    it('replaces empty blockquote with paragraph containing ">"', () => {
      const md = '>';

      const tree = mdxish(md);
      // Empty blockquote is replaced with paragraph containing '>'
      const textContent = extractText(tree);
      expect(textContent.trim()).toBe('>');

      // Verify it's NOT a blockquote element in HAST
      const hasBlockquote = tree.children.some(
        child =>
          child &&
          typeof child === 'object' &&
          'type' in child &&
          child.type === 'element' &&
          'tagName' in child &&
          child.tagName === 'blockquote',
      );
      expect(hasBlockquote).toBe(false);
    });
  });

  describe('relaxed md syntax, such as', () => {
    it('wrong bold syntax', () => {
      const md = `**Bold**

Normal

Hello** Wrong Bold**`;
      const tree = mdxish(md);

      const getStrongTexts = (node: Root | Root['children'][number]): string[] => {
        const texts: string[] = [];
        if ('type' in node && node.type === 'element' && node.tagName === 'strong') {
          const textNodes =
            'children' in node && Array.isArray(node.children)
              ? node.children.filter(c => 'type' in c && c.type === 'text')
              : [];
          texts.push(textNodes.map(t => ('value' in t ? t.value : '')).join(''));
        }
        if ('children' in node && Array.isArray(node.children)) {
          node.children.forEach(child => {
            texts.push(...getStrongTexts(child));
          });
        }
        return texts;
      };

      const strongTexts = getStrongTexts(tree);
      expect(strongTexts.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('mdxish safeMode', () => {
  describe('with safeMode: false (default)', () => {
    it('should evaluate inline expressions', () => {
      const md = 'Result: {5 * 10}';
      const tree = mdxish(md, { jsxContext: {} });
      const text = extractText(tree);
      expect(text).toContain('50');
    });

    it('should evaluate attribute expressions', () => {
      const md = '<a href={baseUrl}>Link</a>';
      const tree = mdxish(md, { jsxContext: { baseUrl: 'https://example.com' } });
      const anchor = findElementByTagName(tree, 'a');
      expect(anchor?.properties?.href).toBe('https://example.com');
    });

    it('should parse user variables', () => {
      const md = 'Hello {user.name}!';
      const tree = mdxish(md);
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('name');
    });
  });

  describe('with safeMode: true', () => {
    it('should NOT evaluate inline expressions - keep as literal text', () => {
      const md = 'Result: {5 * 10}';
      const tree = mdxish(md, { safeMode: true });
      const text = extractText(tree);
      expect(text).toContain('{5 * 10}');
      expect(text).not.toContain('50');
    });

    it('should NOT evaluate attribute expressions', () => {
      const md = '<a href={baseUrl}>Link</a>';
      const tree = mdxish(md, { safeMode: true, jsxContext: { baseUrl: 'https://example.com' } });
      const anchor = findElementByTagName(tree, 'a');
      expect(anchor?.properties?.href).not.toBe('https://example.com');
    });

    it('should still parse user variables', () => {
      const md = 'Hello {user.name}!';
      const tree = mdxish(md);
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('name');
    });

    it('should still process regular markdown syntax', () => {
      const md = '# Heading\n\n**bold** and _italic_';
      const tree = mdxish(md, { safeMode: true });
      const text = extractText(tree);
      expect(text).toContain('Heading');
      expect(text).toContain('bold');
      expect(text).toContain('italic');
    });

    it('should still process custom components', () => {
      const md = '<Callout>Important message</Callout>';
      expect(() => mdxish(md, { safeMode: true })).not.toThrow();
    });
  });

  describe('mdxishAstProcessor with safeMode', () => {
    it('should not include mdxExpression extensions in safeMode', () => {
      const md = 'Test {expression}';
      const { processor } = mdxishAstProcessor(md, { safeMode: true });
      const mdast = processor.parse(md);
      const hasMdxExpression = JSON.stringify(mdast).includes('mdxTextExpression');
      expect(hasMdxExpression).toBe(false);
    });

    it('should include mdxExpression extensions without safeMode', () => {
      const md = 'Test {expression}';
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { safeMode: false });
      const mdast = processor.parse(parserReadyContent);
      const hasMdxExpression = JSON.stringify(mdast).includes('mdxTextExpression');
      expect(hasMdxExpression).toBe(true);
    });
  });
});

describe('heading slugs', () => {
  it('should generate slugs from variable names, not resolved values', () => {
    const md = '## Hello {user.name}';
    const tree = mdxish(md);
    const headings = findAllHeadings(tree);
    expect(headings).toHaveLength(1);
    expect(headings[0].id).toBe('hello-username');
  });

  it('should generate correct slugs for plain headings', () => {
    const md = '## Plain heading';
    const tree = mdxish(md);
    const headings = findAllHeadings(tree);
    expect(headings).toHaveLength(1);
    expect(headings[0].id).toBe('plain-heading');
  });

  it('should handle multiple headings with variables', () => {
    const md = '## Hello {user.name}\n\n## Goodbye {user.email}';
    const tree = mdxish(md);
    const headings = findAllHeadings(tree);
    expect(headings).toHaveLength(2);
    expect(headings[0].id).toBe('hello-username');
    expect(headings[1].id).toBe('goodbye-useremail');
  });

  it('should deduplicate heading slugs', () => {
    const md = '## Hello {user.name}\n\n## Hello {user.name}';
    const tree = mdxish(md);
    const headings = findAllHeadings(tree);
    expect(headings).toHaveLength(2);
    expect(headings[0].id).toBe('hello-username');
    expect(headings[1].id).toBe('hello-username-1');
  });

  it('should handle mixed plain and variable headings', () => {
    const md = '## Introduction\n\n## Welcome {user.name}\n\n## Summary';
    const tree = mdxish(md);
    const headings = findAllHeadings(tree);
    expect(headings).toHaveLength(3);
    expect(headings[0].id).toBe('introduction');
    expect(headings[1].id).toBe('welcome-username');
    expect(headings[2].id).toBe('summary');
  });

  it('should handle headings with only a variable', () => {
    const md = '## {user.name}';
    const tree = mdxish(md);
    const headings = findAllHeadings(tree);
    expect(headings).toHaveLength(1);
    expect(headings[0].id).toBe('username');
  });

  describe('sourceHeadingTexts', () => {
    it('should use provided texts for slugs instead of rendered content', () => {
      const content = '## Hello World';
      const tree = mdxish(content, { sourceHeadingTexts: ['Hello {user.name}'] });
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello-username');
    });

    it('should use source text for legacy variable headings', () => {
      const content = '## Setup some-value';
      const tree = mdxish(content, { sourceHeadingTexts: ['Setup <<MY_VAR>>'] });
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('setup-my_var');
    });

    it('should handle multiple headings with sourceHeadingTexts', () => {
      const content = '## Hello World\n\n## Setup some-value';
      const tree = mdxish(content, { sourceHeadingTexts: ['Hello {user.name}', 'Setup <<MY_VAR>>'] });
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(2);
      expect(headings[0].id).toBe('hello-username');
      expect(headings[1].id).toBe('setup-my_var');
    });

    it('should deduplicate slugs from source texts', () => {
      const content = '## Hello World\n\n## Hello World';
      const tree = mdxish(content, { sourceHeadingTexts: ['Hello {user.name}', 'Hello {user.name}'] });
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(2);
      expect(headings[0].id).toBe('hello-username');
      expect(headings[1].id).toBe('hello-username-1');
    });
  });
});
