import type { Element, Root } from 'hast';

import { mdxish } from '../../lib';
import { JSON_VALUE_MARKER, preprocessJSXExpressions } from '../../processor/transform/mdxish/preprocess-jsx-expressions';

// Helper function to find an element by tag name in a hast tree
function findElementByTagName(node: Element | Root, tagName: string): Element | undefined {
  if (node.type === 'element' && node.tagName === tagName) return node;
  if (!('children' in node)) return undefined;

  return node.children.reduce<Element | undefined>((found, child) => {
    if (found) return found;
    if (child.type !== 'element') return undefined;
    return findElementByTagName(child, tagName);
  }, undefined);
}

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
      expect(result).toContain(`foo="${JSON_VALUE_MARKER}${escapedJson}"`);
      expect(result).not.toContain('foo={a ? {b: 1} : {c: 2}}');
    });

    it('should evaluate template literals with interpolation in JSX expression attributes', () => {
      const content = '<Component greeting={`Hello world my name is <Test>!`} />';
      const result = preprocessJSXExpressions(content);

      // Special characters are escaped for valid HTML attribute values
      expect(result).toContain('greeting="Hello world my name is &lt;Test&gt;!"');
    });

    it('should escape special characters in the template literal attributes', () => {
      const content = '<Component greeting={`Special characters: < > & " \n ; /`} />';
      const result = preprocessJSXExpressions(content);

      // Special characters are escaped: < > & " and newlines
      expect(result).toContain('greeting="Special characters: &lt; &gt; &amp; &quot; &#10; ; /"');
    });
  });

  describe('Code block protection', () => {
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

  describe('Step 4: Escape unbalanced braces', () => {
    it('should not modify balanced braces', () => {
      const content = 'Hello {name}, your balance is {amount}';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe(content);
    });

    it('should escape unclosed opening brace', () => {
      const content = 'Hello {user.name';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe('Hello \\{user.name');
    });

    it('should escape unmatched closing brace', () => {
      const content = 'Hello user.name}';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe('Hello user.name\\}');
    });

    it('should only escape the unbalanced brace, not balanced ones', () => {
      // {customerId} is balanced, {loginPolicyId is not (missing closing brace)
      const content = 'API path: /{customerId}/config/{loginPolicyId';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe('API path: /{customerId}/config/\\{loginPolicyId');
      expect(() => mdxish(result)).not.toThrow();
    });

    it('should escape all unbalanced braces when multiple are unclosed', () => {
      const content = 'Path: /{param1/{param2';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe('Path: /\\{param1/\\{param2');
      expect(() => mdxish(result)).not.toThrow();
    });

    it('should escape unbalanced braces even though the bracket counts are equal', () => {
      const content = 'Close 1 } Open 1 { 1 + 1 } Open 2 {';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe('Close 1 \\} Open 1 { 1 + 1 } Open 2 \\{');
      expect(() => mdxish(result)).not.toThrow();
    });

    it('should leave nested balanced braces alone', () => {
      const content = 'Expression: {a{b}c}';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe(content);
    });

    it('should not double-escape already escaped braces', () => {
      const content = 'Already escaped: \\{foo\\}';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe(content);
    });

    describe('should not escape braces in protected content', () => {
      it('fenced code blocks', () => {
        const content = '```js\nconst x = {unclosed\n```';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
      });

      it('inline code', () => {
        const content = 'Use `{unclosed` for templates';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
      });

      it('magic blocks', () => {
        const content = '[block:html]{"html":" unclosed { unclosed "}[/block]';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
      });

      it('html blocks', () => {
        const content = '<HTMLBlock>{`unclosed } { unclosed `}</HTMLBlock>';
        const tree = mdxish(content);

        const htmlBlock = findElementByTagName(tree, 'HTMLBlock');
        expect(htmlBlock?.tagName).toBe('HTMLBlock');

        const htmlProp = htmlBlock?.properties?.html as string;
        expect(htmlProp).toContain('unclosed } { unclosed ');
      });
    });

    it('should handle string literals inside expressions', () => {
      // The closing brace inside the string should not close the expression
      const content = '{"}"}';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe(content);
    });
  });
});
