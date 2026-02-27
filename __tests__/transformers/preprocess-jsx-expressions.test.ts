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
  describe('Step 2: Evaluate attribute expressions', () => {
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

  describe('Step 3: Escape unbalanced braces', () => {
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

        const htmlBlock = findElementByTagName(tree, 'html-block');
        expect(htmlBlock?.tagName).toBe('html-block');

        const htmlProp = htmlBlock?.properties?.html as string;
        expect(htmlProp).toContain('unclosed } { unclosed ');
      });
    });

    it('should escape unclosed braces in content with emojis', () => {
      // Regression test: emojis are multi-byte Unicode that used to break position tracking
      const content = '📘 test {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('📘 test \\{');
    });

    it('should escape unclosed braces in blockquote with emoji', () => {
      const content = '> 📘 test {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('> 📘 test \\{');
    });

    it('should escape unclosed braces in multi-line callout with emoji', () => {
      const content = `> 📘 Title
>
> test {`;
      const result = preprocessJSXExpressions(content);
      expect(result).toContain('\\{');
      expect(() => mdxish(result)).not.toThrow();
    });

    it('should escape unclosed braces in content with Mandarin characters', () => {
      // Regression test: multi-byte Unicode characters (Chinese) should not break position tracking
      const content = '汉字 test {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('汉字 test \\{');
    });

    it('should escape unclosed braces in blockquote with Mandarin characters', () => {
      const content = '> 吉 test {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('> 吉 test \\{');
    });

    it('should escape unclosed braces in content with math notation symbols', () => {
      // Regression test: math Unicode symbols should not break position tracking
      const content = '∑∫∞ test {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('∑∫∞ test \\{');
    });

    it('should escape unclosed braces in content with square root and math symbols', () => {
      const content = '√2 + ∆x {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('√2 + ∆x \\{');
    });

    it('should escape unclosed braces in blockquote with math notation', () => {
      const content = '> π ≈ 3.14 {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('> π ≈ 3.14 \\{');
    });

    it('should escape unclosed braces with mixed Unicode characters', () => {
      const content = '汉字 📘 ∑ test {';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('汉字 📘 ∑ test \\{');
    });

    it('should escape unmatched closing brace with Mandarin characters', () => {
      const content = '汉字 test }';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('汉字 test \\}');
    });

    it('should escape unmatched closing brace with math symbols', () => {
      const content = '∞ test }';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe('∞ test \\}');
    });

    it('should handle balanced braces with mixed Unicode characters', () => {
      const content = '汉字 {name} 📘 {amount} ∑';
      const result = preprocessJSXExpressions(content);
      expect(result).toBe(content);
    });

    it('should escape unclosed braces in multi-line callout with Mandarin and math symbols', () => {
      const content = `> 汉字 Title
>
> ∑∫ test {`;
      const result = preprocessJSXExpressions(content);
      expect(result).toContain('\\{');
      expect(() => mdxish(result)).not.toThrow();
    });

    it('should handle string literals inside expressions', () => {
      // The closing brace inside the string should not close the expression
      const content = '{"}"}';
      const result = preprocessJSXExpressions(content);

      expect(result).toBe(content);
    });

    describe('paragraph-spanning expressions (blank lines)', () => {
      it('should escape braces when separated by blank line', () => {
        // A blank line causes markdown to split content into separate paragraphs
        // which would cause MDX expression parsing to fail
        const content = '{\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should escape braces with whitespace-only blank line', () => {
        const content = '{\n   \n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n   \n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should escape braces with tab blank line', () => {
        const content = '{\n\t\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\t\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not escape braces with content but no blank line', () => {
        // Single newlines don't create paragraph boundaries
        const content = '{\nsome content\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
      });

      it('should escape braces in text with surrounding content', () => {
        const content = 'Hello {\n\n} World';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('Hello \\{\n\n\\} World');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should escape nested braces when outer has blank line', () => {
        const content = '{\n{\n\n}\n}';
        const result = preprocessJSXExpressions(content);

        // Both the outer and inner braces should be escaped
        expect(result).toContain('\\{');
        expect(result).toContain('\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not escape braces inside string literals even with blank lines', () => {
        // The blank line is inside a string literal, so it shouldn't trigger escaping
        const content = '{"some\n\nstring"}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
      });

      it('should handle multiple separate expressions with blank lines', () => {
        const content = '{\n\n} text {\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\n\\} text \\{\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle mixed unbalanced and paragraph-spanning braces', () => {
        // First { is unbalanced, second pair spans paragraph
        const content = 'unclosed { then {\n\n} end';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('unclosed \\{ then \\{\n\n\\} end');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle paragraph-spanning with emoji content', () => {
        const content = '📘 {\n\n} 🎉';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('📘 \\{\n\n\\} 🎉');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle multiple consecutive blank lines', () => {
        const content = '{\n\n\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\n\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle blank line with mixed whitespace (spaces and tabs)', () => {
        const content = '{\n  \t  \n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n  \t  \n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle deeply nested braces where only innermost spans blank line', () => {
        // Outer braces don't span blank line, only inner does
        const content = '{outer{inner\n\n}outer}';
        const result = preprocessJSXExpressions(content);

        // Both should be escaped since the inner blank line affects both
        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle 3 levels of nested braces with blank line at deepest', () => {
        const content = '{a{b{c\n\n}b}a}';
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle alternating expressions with and without blank lines', () => {
        // First valid, second spans blank line, third valid
        const content = '{valid} {\n\n} {alsoValid}';
        const result = preprocessJSXExpressions(content);

        // Only the middle one should be escaped
        expect(result).toBe('{valid} \\{\n\n\\} {alsoValid}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle blank line followed by content then closing brace', () => {
        const content = '{\n\ncontent}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\ncontent\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle content then blank line then closing brace', () => {
        const content = '{content\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{content\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle expression inside template literal that spans blank line', () => {
        // Template literal with blank line - braces inside template shouldn't be affected
        const content = '{\`template\n\nwith blank\`}';
        const result = preprocessJSXExpressions(content);

        // Should NOT be escaped because blank line is inside template literal
        expect(result).toBe(content);
      });

      it('should handle single quote string with blank line', () => {
        const content = "{'\n\n'}";
        const result = preprocessJSXExpressions(content);

        // Should NOT be escaped because blank line is inside string
        expect(result).toBe(content);
      });

      it('should handle double quote string with blank line', () => {
        const content = '{"text\n\nmore"}';
        const result = preprocessJSXExpressions(content);

        // Should NOT be escaped because blank line is inside string
        expect(result).toBe(content);
      });

      it('should handle escaped quotes inside string with blank line', () => {
        const content = '{"escaped\\"quote\n\nhere"}';
        const result = preprocessJSXExpressions(content);

        // Should NOT be escaped because blank line is inside string
        expect(result).toBe(content);
      });

      it('should handle paragraph-spanning with Mandarin characters', () => {
        const content = '中文 {\n\n} 测试';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('中文 \\{\n\n\\} 测试');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle paragraph-spanning with mixed script content', () => {
        const content = 'Hello 你好 مرحبا {\n\n} World 世界';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('Hello 你好 مرحبا \\{\n\n\\} World 世界');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle paragraph-spanning with complex emoji sequences', () => {
        // Emoji with skin tone modifier and ZWJ sequences
        const content = '👩🏽‍💻 {\n\n} 👨‍👩‍👧‍👦';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('👩🏽‍💻 \\{\n\n\\} 👨‍👩‍👧‍👦');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle multiple blank lines in sequence within expression', () => {
        const content = '{\n\n\n\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\n\n\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle blank line at very start of expression content', () => {
        const content = '{\n\nimmediately after blank}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\nimmediately after blank\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle blank line at very end of expression content', () => {
        const content = '{content here\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{content here\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });
    });

    describe('stress tests - complex real-world scenarios', () => {
      it('should handle API documentation with path parameters and blank lines', () => {
        const content = `GET /api/{version}/users

{

}

POST /api/{version}/data`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('{version}'); // Path param should stay
        expect(result).toContain('\\{'); // Empty expression with blank line escaped
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle JSON-like content accidentally split by blank lines', () => {
        const content = `{
  "key": "value"

}`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle code example with curly braces and blank lines', () => {
        const content = `Here's an example:

{

const x = 1;

}

That's the code.`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle markdown with balanced braces mixed with problematic ones', () => {
        const content = `Valid expression: {1 + 1}

Problematic:
{

}

Another valid: {name}`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('{1 + 1}'); // Valid stays
        expect(result).toContain('{name}'); // Valid stays
        expect(result).toContain('\\{'); // Problematic escaped
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle callout block with curly braces spanning blank line', () => {
        // In blockquotes, the > prefix on each line means the braces are
        // split across lines with content (the > char), not truly blank lines.
        // This tests that unbalanced braces in blockquotes are handled.
        const content = `> 📘 Note
>
> { unclosed`;
        const result = preprocessJSXExpressions(content);

        // The unbalanced brace should be escaped
        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle list with expression spanning multiple items via blank line', () => {
        const content = `- Item 1 {

- Item 2 }`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(result).toContain('\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle heading followed by expression with blank line', () => {
        const content = `# Title

{

}

## Another Title`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle table with expressions containing blank lines in cells', () => {
        const content = `| Col1 | Col2 |
|------|------|
| {

} | data |`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle JSX component with expression prop spanning blank line', () => {
        // Attribute expressions with blank lines get evaluated (to undefined)
        // by evaluateAttributeExpressions before escapeProblematicBraces runs.
        // This tests that the result doesn't crash.
        const content = `<Component value={

} />`;
        const result = preprocessJSXExpressions(content);

        // The expression is evaluated to undefined
        expect(result).toContain('value="undefined"');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle HTML with curly braces in text spanning blank line', () => {
        const content = `<div>
{

}
</div>`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle very long content between braces with blank line', () => {
        const longContent = 'a'.repeat(1000);
        const content = `{${longContent}\n\n${longContent}}`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(result).toContain('\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle interleaved balanced and unbalanced with blank lines', () => {
        const content = `{valid} {\n\n} {valid2} unbalanced{ {\n\n}`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('{valid}');
        expect(result).toContain('{valid2}');
        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle documentation with curly braces in various contexts', () => {
        const content = `# API Reference

Use \`{variable}\` syntax for interpolation.

Parameters:
- \`{userId}\` - The user ID

{

This empty expression would crash

}

## Examples

\`\`\`js
const obj = {key: value};
\`\`\``;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('`{variable}`'); // Inline code preserved
        expect(result).toContain('`{userId}`'); // Inline code preserved
        expect(result).toContain('\\{'); // Problematic escaped
        expect(result).toContain('{key: value}'); // Code block preserved
        expect(() => mdxish(result)).not.toThrow();
      });
    });

    describe('stress tests - boundary conditions', () => {
      it('should handle single opening brace at document start with blank line', () => {
        const content = '{\n\ntext';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\ntext');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle single closing brace at document end with blank line', () => {
        const content = 'text\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('text\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle only blank line and braces', () => {
        const content = '{\n\n}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe('\\{\n\n\\}');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle expression at exact paragraph boundary', () => {
        const content = 'Para 1\n\n{\n\n}\n\nPara 3';
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle 10 consecutive expressions with blank lines', () => {
        const expressions = Array(10).fill('{\n\n}').join(' ');
        const result = preprocessJSXExpressions(expressions);

        // All should be escaped
        const escapedCount = (result.match(/\\{/g) || []).length;
        expect(escapedCount).toBe(10);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle rapid alternation of valid and invalid expressions', () => {
        const content = '{a}{\n\n}{b}{\n\n}{c}{\n\n}{d}';
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('{a}');
        expect(result).toContain('{b}');
        expect(result).toContain('{c}');
        expect(result).toContain('{d}');
        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle expression spanning 100 lines including blank lines', () => {
        const lines = Array(50).fill('line').join('\n');
        const content = `{${lines}\n\n${lines}}`;
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('\\{');
        expect(() => mdxish(result)).not.toThrow();
      });
    });

    describe('stress tests - regression prevention', () => {
      it('should not affect valid JSX component expressions', () => {
        // Attribute expressions are evaluated and HTML-escaped
        const content = '<Button onClick={() => alert("hi")}>Click</Button>';
        const result = preprocessJSXExpressions(content);

        // The arrow function is evaluated and HTML-escaped in the attribute
        expect(result).toContain('onClick="');
        expect(result).toContain('alert');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not affect valid object literal in attributes', () => {
        const content = '<div style={{ color: "red", fontSize: "16px" }}>Text</div>';
        const result = preprocessJSXExpressions(content);

        expect(result).toContain('style="color: red; font-size: 16px"');
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not affect valid ternary expressions', () => {
        const content = '{condition ? "yes" : "no"}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not affect valid template literals with interpolation', () => {
        // eslint-disable-next-line no-template-curly-in-string
        const content = '{`Hello ${name}!`}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not affect valid nested function calls', () => {
        const content = '{Math.max(1, Math.min(10, value))}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not affect valid object destructuring pattern', () => {
        const content = '{({ a, b }) => a + b}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should not affect valid array expressions', () => {
        const content = '{[1, 2, 3].map(x => x * 2)}';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should preserve protected code blocks with blank lines', () => {
        const content = '```\n{\n\n}\n```';
        const result = preprocessJSXExpressions(content);

        // Code block should be preserved exactly
        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should preserve inline code with blank-line-like content', () => {
        const content = 'Use `{\\n\\n}` for blank lines';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should preserve magic blocks with curly braces', () => {
        const content = '[block:code]\n{"codes":[{"code":"{\\n\\n}","language":"text"}]}\n[/block]';
        const result = preprocessJSXExpressions(content);

        expect(result).toBe(content);
        expect(() => mdxish(result)).not.toThrow();
      });

      it('should handle HTMLBlock with blank-line-like content preserved', () => {
        const content = '<HTMLBlock>{`<div>{\n\n}</div>`}</HTMLBlock>';
        const result = preprocessJSXExpressions(content);

        // HTMLBlock content should be protected
        expect(() => mdxish(result)).not.toThrow();
      });
    });
  });
});
