import { preprocessJSXExpressions } from '../../processor/transform/mdxish/preprocess-jsx-expressions';

describe('preprocessJSXExpressions', () => {
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
