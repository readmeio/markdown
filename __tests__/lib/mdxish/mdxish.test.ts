import type { Root } from 'hast';

import { mdxish } from '../../../lib/mdxish';

describe('mdxish should render', () => {
  describe('invalid mdx syntax', () => {
    it('should render unclosed tags', () => {
      const md = '<br>';
      expect(() => mdxish(md)).not.toThrow();
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
