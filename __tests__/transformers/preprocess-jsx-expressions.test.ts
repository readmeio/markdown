import { mix } from '../../lib';
import { preprocessJSXExpressions } from '../../processor/transform/mdxish/preprocess-jsx-expressions';

describe('preprocessJSXExpressions', () => {
  describe('using the default jsx context', () => {
    it('should evaluate the string operations', () => {
      const content = 'Hello {"world".toUpperCase()} {"world".length}';
      const result = mix(content);
      expect(result).toContain('Hello WORLD 5');
      expect(result).not.toContain('{"world".toUpperCase()}');
      expect(result).not.toContain('{"world".length}');
    });

    it('should evaluate number operations when math symbols are used', () => {
      const content = '{1 + 2 - 1} {4 * 2 / 2}';
      const result = mix(content);
      expect(result).toContain('2 4');
      expect(result).not.toContain('{1 + 2 - 1}');
      expect(result).not.toContain('{4 * 2 / 2}');
    });

    it('should not evaluate operations when not in braces', () => {
      const content = '1 + 2 "world".toUpperCase()';
      const result = mix(content);
      expect(result).toContain(content);
      expect(result).not.toContain('WORLD');
      expect(result).not.toContain('3');
    });
  });

  describe('Step 3: Evaluate attribute expressions', () => {
    it('should evaluate JSX attribute expressions and convert them to string attributes', () => {
      const context = {
        baseUrl: 'https://example.com',
        userId: '123',
        isActive: true,
      };

      const content = '<a href={baseUrl} id={userId} active={isActive}>Link</a>';
      const result = preprocessJSXExpressions(content, context);

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('id="123"');
      expect(result).toContain('active="true"');
      expect(result).not.toContain('href={baseUrl}');
      expect(result).not.toContain('id={userId}');
      expect(result).not.toContain('active={isActive}');
    });

    it.each([
      [true, '{"b":1}'],
      [false, '{"c":2}'],
    ])('should handle nested dictionary attributes when a is %s', (a, expectedJson) => {
      const context = { a };

      const content = '<div foo={a ? {b: 1} : {c: 2}}>Link</div>';
      const result = preprocessJSXExpressions(content, context);

      expect(result).toContain(`foo='${expectedJson}'`);
      expect(result).not.toContain('foo={a ? {b: 1} : {c: 2}}');
    });
  });
});
