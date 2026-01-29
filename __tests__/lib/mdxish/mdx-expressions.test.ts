import type { Element, Text } from 'hast';

import { describe, it, expect } from 'vitest';

import { mdxish } from '../../../lib/mdxish';

describe('mdxish MDX expressions', () => {
  describe('inline expressions', () => {
    it('should evaluate simple math expression inline', () => {
      const md = 'The answer is {1 + 1}.';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('2');
    });

    it('should evaluate variable from context inline', () => {
      const md = 'Hello {user.name}!';
      const ast = mdxish(md, { jsxContext: { user: { name: 'Alice' } } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello Alice!');
    });

    it('should handle multiple expressions in one line', () => {
      const md = '{user.firstName} {user.lastName} is {user.age} years old.';
      const ast = mdxish(md, {
        jsxContext: { user: { firstName: 'John', lastName: 'Doe', age: 30 } },
      });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('John Doe is 30 years old.');
    });

    it('should handle expression at start of line', () => {
      const md = '{greeting} world!';
      const ast = mdxish(md, { jsxContext: { greeting: 'Hello' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello world!');
    });

    it('should handle expression at end of line', () => {
      const md = 'The value is {value}';
      const ast = mdxish(md, { jsxContext: { value: 42 } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('The value is 42');
    });

    it('should handle expression as entire line content', () => {
      const md = '{message}';
      const ast = mdxish(md, { jsxContext: { message: 'Hello World' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello World');
    });
  });

  describe('standalone expressions (own line)', () => {
    it('should render standalone expression in paragraph', () => {
      const md = `Before

{value}

After`;
      const ast = mdxish(md, { jsxContext: { value: 'Middle' } });

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      expect(paragraphs).toHaveLength(3);

      const middleP = paragraphs[1];
      const text = middleP.children.find(c => c.type === 'text') as Text;
      expect(text.value).toBe('Middle');
    });

    it('should render standalone math expression', () => {
      const md = `Result:

{10 * 5}`;
      const ast = mdxish(md);

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      const lastP = paragraphs[paragraphs.length - 1];
      const text = lastP.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('50');
    });

    it('should handle multiple standalone expressions', () => {
      const md = `{a}

{b}

{c}`;
      const ast = mdxish(md, { jsxContext: { a: 'First', b: 'Second', c: 'Third' } });

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      expect(paragraphs).toHaveLength(3);

      expect((paragraphs[0].children[0] as Text).value).toBe('First');
      expect((paragraphs[1].children[0] as Text).value).toBe('Second');
      expect((paragraphs[2].children[0] as Text).value).toBe('Third');
    });
  });

  describe('expressions with special values', () => {
    it('should handle empty string value', () => {
      const md = 'Value: {empty}';
      const ast = mdxish(md, { jsxContext: { empty: '' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Value: ');
    });

    it('should handle zero value', () => {
      const md = 'Count: {count}';
      const ast = mdxish(md, { jsxContext: { count: 0 } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Count: 0');
    });

    it('should handle boolean values', () => {
      const md = 'Active: {isActive}';
      const ast = mdxish(md, { jsxContext: { isActive: true } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Active: true');
    });

    it('should handle null value', () => {
      const md = 'Value: {nullVal}';
      const ast = mdxish(md, { jsxContext: { nullVal: null } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('Value:');
    });

    it('should handle undefined value', () => {
      const md = 'Value: {undefinedVal}';
      const ast = mdxish(md, { jsxContext: { undefinedVal: undefined } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('Value:');
    });

    it('should handle array value', () => {
      const md = 'Items: {items}';
      const ast = mdxish(md, { jsxContext: { items: [1, 2, 3] } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('Items:');
    });

    it('should handle string with special characters', () => {
      const md = 'Message: {msg}';
      const ast = mdxish(md, { jsxContext: { msg: 'Hello <world> & "friends"' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('expressions in markdown contexts', () => {
    it('should work in list items', () => {
      const md = `- Item {num}
- Another {num}`;
      const ast = mdxish(md, { jsxContext: { num: 1 } });

      const ul = ast.children.find(c => (c as Element).tagName === 'ul') as Element;
      expect(ul).toBeDefined();

      const listItems = ul.children.filter(c => (c as Element).tagName === 'li') as Element[];
      expect(listItems).toHaveLength(2);
    });

    it('should work in blockquotes', () => {
      const md = '> Quote from {author}';
      const ast = mdxish(md, { jsxContext: { author: 'Shakespeare' } });

      const blockquote = ast.children.find(c => (c as Element).tagName === 'blockquote') as Element;
      expect(blockquote).toBeDefined();
    });

    it('should work in headings', () => {
      const md = '# Hello {name}';
      const ast = mdxish(md, { jsxContext: { name: 'World' } });

      const h1 = ast.children.find(c => (c as Element).tagName === 'h1') as Element;
      expect(h1).toBeDefined();

      const text = h1.children.find(c => c.type === 'text') as Text;
      expect(text.value).toBe('Hello World');
    });

    it('should work in bold text', () => {
      const md = '**{emphasis}**';
      const ast = mdxish(md, { jsxContext: { emphasis: 'Important' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const strong = p.children.find(c => (c as Element).tagName === 'strong') as Element;
      expect(strong).toBeDefined();
    });

    it('should work in italic text', () => {
      const md = '*{emphasis}*';
      const ast = mdxish(md, { jsxContext: { emphasis: 'Emphasis' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const em = p.children.find(c => (c as Element).tagName === 'em') as Element;
      expect(em).toBeDefined();
    });

    it('should work in links', () => {
      const md = '[{linkText}]({url})';
      const ast = mdxish(md, { jsxContext: { linkText: 'Click here', url: 'https://example.com' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const a = p.children.find(c => (c as Element).tagName === 'a') as Element;
      expect(a).toBeDefined();
    });

    it('should work in table cells', () => {
      const md = `| Name | Value |
| --- | --- |
| Item | {val} |`;
      const ast = mdxish(md, { jsxContext: { val: 42 } });

      const table = ast.children.find(c => (c as Element).tagName === 'table') as Element;
      expect(table).toBeDefined();
    });
  });

  describe('complex expressions', () => {
    it('should handle ternary expressions', () => {
      const md = '{isAdmin ? "Admin" : "User"}';
      const ast = mdxish(md, { jsxContext: { isAdmin: true } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Admin');
    });

    it('should handle nested object access', () => {
      const md = '{user.profile.settings.theme}';
      const ast = mdxish(md, {
        jsxContext: {
          user: { profile: { settings: { theme: 'dark' } } },
        },
      });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('dark');
    });

    it('should handle template literals in expression', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const md = '{`Hello ${name}!`}';
      const ast = mdxish(md, { jsxContext: { name: 'World' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello World!');
    });

    it('should handle method calls', () => {
      const md = '{text.toUpperCase()}';
      const ast = mdxish(md, { jsxContext: { text: 'hello' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('HELLO');
    });

    it('should handle array access', () => {
      const md = '{items[0]}';
      const ast = mdxish(md, { jsxContext: { items: ['first', 'second'] } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('first');
    });

    it('should handle arithmetic operations', () => {
      const md = '{(a + b) * c}';
      const ast = mdxish(md, { jsxContext: { a: 2, b: 3, c: 4 } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('20');
    });

    it('should handle comparison expressions', () => {
      const md = '{a > b}';
      const ast = mdxish(md, { jsxContext: { a: 10, b: 5 } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('true');
    });

    it('should handle logical expressions', () => {
      const md = '{a && b}';
      const ast = mdxish(md, { jsxContext: { a: true, b: 'yes' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('yes');
    });
  });

  describe('expressions with braces', () => {
    it('should handle object literals in expressions', () => {
      const md = '{JSON.stringify({ key: "value" })}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('key');
    });

    it('should handle nested braces in template literals', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const md = '{`Value: ${obj.value}`}';
      const ast = mdxish(md, { jsxContext: { obj: { value: 42 } } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Value: 42');
    });
  });

  describe('expressions mixed with magic blocks', () => {
    it('should handle expression before magic block', () => {
      const md = `Value: {value}

[block:code]
{
  "codes": [{"code": "test", "language": "js"}]
}
[/block]`;
      const ast = mdxish(md, { jsxContext: { value: 42 } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();

      const text = p.children.find(c => c.type === 'text') as Text;
      expect(text.value).toBe('Value: 42');
    });

    it('should handle expression after magic block', () => {
      const md = `[block:code]
{
  "codes": [{"code": "test", "language": "js"}]
}
[/block]

Result: {result}`;
      const ast = mdxish(md, { jsxContext: { result: 'success' } });

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      const lastP = paragraphs[paragraphs.length - 1];
      const text = lastP?.children.find(c => c.type === 'text') as Text;

      expect(text?.value).toContain('success');
    });

    it('should handle expression on same line as text before magic block', () => {
      const md = `Before {value} text [block:code]
{
  "codes": [{"code": "echo hello", "language": "bash"}]
}
[/block] after`;
      const ast = mdxish(md, { jsxContext: { value: 'middle' } });

      // Should have parsed the magic block correctly
      const codeTabs = ast.children.find(
        c => (c as Element).tagName === 'CodeTabs',
      ) as Element;
      expect(codeTabs).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty expression', () => {
      const md = 'Value: {}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should handle expression with only whitespace', () => {
      const md = 'Value: {   }';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should handle adjacent expressions', () => {
      const md = '{a}{b}{c}';
      const ast = mdxish(md, { jsxContext: { a: '1', b: '2', c: '3' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('123');
    });

    it('should handle expression with newline in value', () => {
      const md = '{multiline}';
      const ast = mdxish(md, { jsxContext: { multiline: 'line1\nline2' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should not confuse JSON-like content with expressions', () => {
      const md = 'Config: `{"key": "value"}`';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const code = p.children.find(c => (c as Element).tagName === 'code') as Element;
      expect(code).toBeDefined();
    });

    it('should handle expression in code spans (should not evaluate)', () => {
      const md = 'Use `{variable}` syntax';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const code = p.children.find(c => (c as Element).tagName === 'code') as Element;
      expect(code).toBeDefined();

      const codeText = code.children.find(c => c.type === 'text') as Text;
      expect(codeText.value).toBe('{variable}');
    });

    it('should handle curly braces in code blocks (should not evaluate)', () => {
      const md = `\`\`\`js
const obj = {key: "value"};
\`\`\``;
      const ast = mdxish(md);

      // Code blocks may be wrapped in CodeTabs or be a pre element
      const hasCodeBlock = ast.children.some(
        c =>
          (c as Element).tagName === 'pre' ||
          (c as Element).tagName === 'CodeTabs' ||
          (c as Element).tagName === 'code',
      );
      expect(hasCodeBlock).toBe(true);
    });

    it('should handle escaped braces', () => {
      const md = 'Use \\{braces\\} for expressions';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should handle deeply nested context access', () => {
      const md = '{a.b.c.d.e}';
      const ast = mdxish(md, {
        jsxContext: { a: { b: { c: { d: { e: 'deep' } } } } },
      });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('deep');
    });

    it('should handle missing context variable gracefully', () => {
      const md = '{nonexistent}';
      const ast = mdxish(md, { jsxContext: {} });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should handle expression at document start', () => {
      const md = '{greeting}';
      const ast = mdxish(md, { jsxContext: { greeting: 'Hello' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello');
    });

    it('should handle expression at document end', () => {
      const md = `Some text

{farewell}`;
      const ast = mdxish(md, { jsxContext: { farewell: 'Goodbye' } });

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      const lastP = paragraphs[paragraphs.length - 1];
      const text = lastP.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Goodbye');
    });

    it('should handle very long expression values', () => {
      const longValue = 'a'.repeat(1000);
      const md = '{longVal}';
      const ast = mdxish(md, { jsxContext: { longVal: longValue } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe(longValue);
    });

    it('should handle unicode in expressions', () => {
      const md = '{emoji}';
      const ast = mdxish(md, { jsxContext: { emoji: '👋🌍' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('👋🌍');
    });

    it('should handle HTML entities in expression values', () => {
      const md = '{html}';
      const ast = mdxish(md, { jsxContext: { html: '&amp; &lt; &gt;' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('multiline content with expressions', () => {
    it('should handle expression in multiline paragraph', () => {
      const md = `This is a paragraph
with {value} in the middle
and continues here.`;
      const ast = mdxish(md, { jsxContext: { value: 'something' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should handle multiple paragraphs with expressions', () => {
      const md = `First {a} paragraph.

Second {b} paragraph.

Third {c} paragraph.`;
      const ast = mdxish(md, { jsxContext: { a: '1', b: '2', c: '3' } });

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      expect(paragraphs).toHaveLength(3);
    });

    it('should handle expression after line break in same paragraph', () => {
      const md = `Line one
{value}`;
      const ast = mdxish(md, { jsxContext: { value: 'Line two' } });

      // Both lines should be in the same paragraph (soft break)
      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('expressions with comments', () => {
    it('should handle expression after HTML comment', () => {
      const md = `<!-- comment -->

{value}`;
      const ast = mdxish(md, { jsxContext: { value: 'after comment' } });

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('expressions in nested structures', () => {
    it('should work in nested lists', () => {
      const md = `- Level 1 {a}
  - Level 2 {b}
    - Level 3 {c}`;
      const ast = mdxish(md, { jsxContext: { a: '1', b: '2', c: '3' } });

      const ul = ast.children.find(c => (c as Element).tagName === 'ul') as Element;
      expect(ul).toBeDefined();
    });

    it('should work in nested blockquotes', () => {
      const md = `> Quote {a}
> > Nested {b}`;
      const ast = mdxish(md, { jsxContext: { a: '1', b: '2' } });

      const blockquote = ast.children.find(c => (c as Element).tagName === 'blockquote') as Element;
      expect(blockquote).toBeDefined();
    });

    it('should work in list inside blockquote', () => {
      const md = '> - Item {value}';
      const ast = mdxish(md, { jsxContext: { value: 'test' } });

      const blockquote = ast.children.find(c => (c as Element).tagName === 'blockquote') as Element;
      expect(blockquote).toBeDefined();
    });
  });
});
