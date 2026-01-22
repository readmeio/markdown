import type { Root } from 'hast';

import { mdxish } from '../../../lib/mdxish';
import { extractText } from '../../../processor/transform/extract-text';

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
