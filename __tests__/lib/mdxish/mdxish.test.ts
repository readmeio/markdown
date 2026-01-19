import type { Root } from 'hast';

import { mdxish } from '../../../lib/mdxish';
import { extractText } from '../../../processor/transform/extract-text';

describe('mdxish should render', () => {
  describe('invalid mdx syntax', () => {
    it('should render unclosed tags', () => {
      const md = '<br>';
      expect(() => mdxish(md)).not.toThrow();
    });
  });

  it('should render content in new lines', () => {
    const md = `<div>hello
</div>`;
    expect(() => mdxish(md)).not.toThrow();
  });

  describe('should handle just ">"', () => {
    it('with format undefined (mdx) - leaves empty blockquote as-is in HAST', () => {
      const md = '>';

      const tree = mdxish(md);
      // With format undefined, empty blockquote is left as blockquote, which becomes empty <blockquote> in HAST
      // Extracting text from empty blockquote gives whitespace, not '>'
      const textContent = extractText(tree);
      expect(textContent.trim()).toBe('');

      // Verify it's a blockquote element in HAST
      const hasBlockquote = tree.children.some(
        child =>
          child &&
          typeof child === 'object' &&
          'type' in child &&
          child.type === 'element' &&
          'tagName' in child &&
          child.tagName === 'blockquote',
      );
      expect(hasBlockquote).toBe(true);
    });

    it('with format "md" - replaces empty blockquote with paragraph containing ">"', () => {
      const md = '>';

      const tree = mdxish(md, { format: 'md' });
      const textContent = extractText(tree);
      // With format 'md', empty blockquote is replaced with paragraph containing '>'
      expect(textContent.trim()).toBe('>');
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
