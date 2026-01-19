import { preprocessJSXExpressions } from '../../processor/transform/mdxish/preprocess-jsx-expressions';

describe('preprocessJSXExpressions', () => {
  describe('Step 3: Evaluate attribute expressions', () => {
    it('should evaluate expressions in the attributes', () => {
      const content = '<div style={{ height: 1+1 + "px" }}>Link</div>';
      const result = preprocessJSXExpressions(content);

      expect(result).toContain('style="height: 2px"');
      expect(result).not.toContain('style={{ height: 1+1 + "px" }}');
    });

    it('should replace variables with their values', () => {
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

      // Objects are serialized with JSON_VALUE_MARKER prefix and HTML-escaped
      const escapedJson = expectedJson.replace(/"/g, '&quot;');
      expect(result).toContain(`foo="${escapedJson}"`);
      expect(result).not.toContain('foo={a ? {b: 1} : {c: 2}}');
    });

    it('should evaluate template literals in JSX expression attributes', () => {
      const content = '<Component header={`Getting Started`} />';
      const result = preprocessJSXExpressions(content);

      expect(result).toContain('header="Getting Started"');
      expect(result).not.toContain('{`');
    });

    it('should evaluate template literals with interpolation in JSX expression attributes', () => {
      const context = { name: 'World' };
      const content = '<Component greeting={`Hello World!`} />';
      const result = preprocessJSXExpressions(content, context);

      expect(result).toContain('greeting="Hello World!"');
    });
  });

  describe('Code block protection', () => {
    it('should preserve inline code outside of JSX expressions', () => {
      const content = 'Text with `inline code` here';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe('Text with `inline code` here');
    });

    it('should preserve fenced code blocks containing JSX-like syntax', () => {
      const content = '```jsx\n<div style={{ color: "red" }}></div>\n```';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe(content);
    });

    it('should not evaluate expressions inside inline code', () => {
      const context = { baseUrl: 'https://example.com' };
      const content = 'Use `href={baseUrl}` syntax';
      const result = preprocessJSXExpressions(content, context);

      expect(result).toBe('Use `href={baseUrl}` syntax');
    });
  });
});
