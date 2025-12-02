import type { Element } from 'hast';

import { mdxish } from '../../index';
import { parseAttributes } from '../../processor/transform/mdxish-component-blocks';

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

  it('should parse Cards tag with columns attribute using mdxish', () => {
    const markdown = '<Cards columns={3}></Cards>';

    const hast = mdxish(markdown);
    const firstChild = hast.children[0] as Element;
    const cards = firstChild.children?.[0] as Element;

    expect(cards.type).toBe('element');
    expect(cards.tagName).toBe('Cards');
    expect(cards.properties.columns).toBe('3');
  });
});
