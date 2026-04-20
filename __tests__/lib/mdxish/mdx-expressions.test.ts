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

    it('should handle expression at start of line', () => {
      const md = '{"Hello"} world!';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello world!');
    });

    it('should handle expression at end of line', () => {
      const md = 'The value is {42}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('The value is 42');
    });

    it('should handle expression as entire line content', () => {
      const md = '{"Hello World"}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello World');
    });
  });

  describe('standalone expressions (own line)', () => {
    it('should render standalone expression in paragraph', () => {
      const md = `Before

{"Middle"}

After`;
      const ast = mdxish(md);

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
      const md = `{"First"}

{"Second"}

{"Third"}`;
      const ast = mdxish(md);

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      expect(paragraphs).toHaveLength(3);

      expect((paragraphs[0].children[0] as Text).value).toBe('First');
      expect((paragraphs[1].children[0] as Text).value).toBe('Second');
      expect((paragraphs[2].children[0] as Text).value).toBe('Third');
    });
  });

  describe('expressions with special values', () => {
    it('should handle empty string value', () => {
      const md = 'Value: {""}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Value: ');
    });

    it('should handle zero value', () => {
      const md = 'Count: {0}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Count: 0');
    });

    it('should handle boolean values', () => {
      const md = 'Active: {true}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Active: true');
    });

    it('should handle null value', () => {
      const md = 'Value: {null}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('Value:');
    });

    it('should handle undefined value', () => {
      const md = 'Value: {undefined}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('Value:');
    });

    it('should handle array value', () => {
      const md = 'Items: {[1, 2, 3]}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toContain('Items:');
    });

    it('should handle string with special characters', () => {
      const md = 'Message: {"Hello <world> & \\"friends\\""}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('expressions in markdown contexts', () => {
    it('should work in list items', () => {
      const md = `- Item {1}
- Another {1}`;
      const ast = mdxish(md);

      const ul = ast.children.find(c => (c as Element).tagName === 'ul') as Element;
      expect(ul).toBeDefined();

      const listItems = ul.children.filter(c => (c as Element).tagName === 'li') as Element[];
      expect(listItems).toHaveLength(2);
    });

    it('should work in blockquotes', () => {
      const md = '> Quote from {"Shakespeare"}';
      const ast = mdxish(md);

      const blockquote = ast.children.find(c => (c as Element).tagName === 'blockquote') as Element;
      expect(blockquote).toBeDefined();
    });

    it('should work in headings', () => {
      const md = '# Hello {"World"}';
      const ast = mdxish(md);

      const h1 = ast.children.find(c => (c as Element).tagName === 'h1') as Element;
      expect(h1).toBeDefined();

      const text = h1.children.find(c => c.type === 'text') as Text;
      expect(text.value).toBe('Hello World');
    });

    it('should work in bold text', () => {
      const md = '**{"Important"}**';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const strong = p.children.find(c => (c as Element).tagName === 'strong') as Element;
      expect(strong).toBeDefined();
    });

    it('should work in italic text', () => {
      const md = '*{"Emphasis"}*';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const em = p.children.find(c => (c as Element).tagName === 'em') as Element;
      expect(em).toBeDefined();
    });

    it('should work in links', () => {
      const md = '[{"Click here"}]({"https://example.com"})';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should work in table cells', () => {
      const md = `| Name | Value |
| --- | --- |
| Item | {42} |`;
      const ast = mdxish(md);

      const table = ast.children.find(c => (c as Element).tagName === 'table') as Element;
      expect(table).toBeDefined();
    });
  });

  describe('complex expressions', () => {
    it('should handle ternary expressions', () => {
      const md = '{true ? "Admin" : "User"}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Admin');
    });

    it('should handle nested object access', () => {
      const md = '{({profile: {settings: {theme: "dark"}}}).profile.settings.theme}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('dark');
    });

    it('should handle template literals in expression', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const md = '{`Hello ${"World"}!`}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello World!');
    });

    it('should handle method calls', () => {
      const md = '{"hello".toUpperCase()}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('HELLO');
    });

    it('should handle array access', () => {
      const md = '{["first", "second"][0]}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('first');
    });

    it('should handle arithmetic operations', () => {
      const md = '{(2 + 3) * 4}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('20');
    });

    it('should handle comparison expressions', () => {
      const md = '{10 > 5}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('true');
    });

    it('should handle logical expressions', () => {
      const md = '{true && "yes"}';
      const ast = mdxish(md);

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
      const md = '{`Value: ${({value: 42}).value}`}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Value: 42');
    });
  });

  describe('expressions mixed with magic blocks', () => {
    it('should handle expression before magic block', () => {
      const md = `Value: {42}

[block:code]
{
  "codes": [{"code": "test", "language": "js"}]
}
[/block]`;
      const ast = mdxish(md);

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

Result: {"success"}`;
      const ast = mdxish(md);

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      const lastP = paragraphs[paragraphs.length - 1];
      const text = lastP?.children.find(c => c.type === 'text') as Text;

      expect(text?.value).toContain('success');
    });

    it('should handle expression on same line as text before magic block', () => {
      const md = `Before {"middle"} text [block:code]
{
  "codes": [{"code": "echo hello", "language": "bash"}]
}
[/block] after`;
      const ast = mdxish(md);

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

    it('should handle multiline empty expression (blank line between braces)', () => {
      // This tests the case where { and } are separated by a blank line
      // which would normally cause markdown to split into different paragraphs
      const md = '{\n\n}';
      const ast = mdxish(md);

      // Should not throw, braces should be escaped and treated as literal text
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should handle expression with blank line in surrounding text', () => {
      const md = 'Hello {\n\n} World';
      const ast = mdxish(md);

      // Should not throw
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should handle nested braces with blank lines', () => {
      const md = '{\n{\n\n}\n}';
      const ast = mdxish(md);

      // Should not throw
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should handle adjacent expressions', () => {
      const md = '{"1"}{"2"}{"3"}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('123');
    });

    it('should handle expression with newline in value', () => {
      const md = '{"line1\\nline2"}';
      const ast = mdxish(md);

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

    it('should handle deeply nested object access', () => {
      const md = '{({a: {b: {c: {d: {e: "deep"}}}}}).a.b.c.d.e}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('deep');
    });

    it('should handle unresolved identifiers as literal text', () => {
      const md = '{nonexistent}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;
      expect(text.value).toContain('{nonexistent}');
    });

    it('should handle expression at document start', () => {
      const md = '{"Hello"}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Hello');
    });

    it('should handle expression at document end', () => {
      const md = `Some text

{"Goodbye"}`;
      const ast = mdxish(md);

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      const lastP = paragraphs[paragraphs.length - 1];
      const text = lastP.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('Goodbye');
    });

    it('should handle very long expression values', () => {
      const longValue = 'a'.repeat(1000);
      const md = `{"${longValue}"}`;
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe(longValue);
    });

    it('should handle unicode in expressions', () => {
      const md = '{"👋🌍"}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      const text = p.children.find(c => c.type === 'text') as Text;

      expect(text.value).toBe('👋🌍');
    });

    it('should handle HTML entities in expression values', () => {
      const md = '{"&amp; &lt; &gt;"}';
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('multiline content with expressions', () => {
    it('should handle expression in multiline paragraph', () => {
      const md = `This is a paragraph
with {"something"} in the middle
and continues here.`;
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });

    it('should handle multiple paragraphs with expressions', () => {
      const md = `First {"1"} paragraph.

Second {"2"} paragraph.

Third {"3"} paragraph.`;
      const ast = mdxish(md);

      const paragraphs = ast.children.filter(c => (c as Element).tagName === 'p') as Element[];
      expect(paragraphs).toHaveLength(3);
    });

    it('should handle expression after line break in same paragraph', () => {
      const md = `Line one
{"Line two"}`;
      const ast = mdxish(md);

      // Both lines should be in the same paragraph (soft break)
      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('expressions with comments', () => {
    it('should handle expression after HTML comment', () => {
      const md = `<!-- comment -->

{"after comment"}`;
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      expect(p).toBeDefined();
    });
  });

  describe('expressions in nested structures', () => {
    it('should work in nested lists', () => {
      const md = `- Level 1 {"1"}
  - Level 2 {"2"}
    - Level 3 {"3"}`;
      const ast = mdxish(md);

      const ul = ast.children.find(c => (c as Element).tagName === 'ul') as Element;
      expect(ul).toBeDefined();
    });

    it('should work in nested blockquotes', () => {
      const md = `> Quote {"1"}
> > Nested {"2"}`;
      const ast = mdxish(md);

      const blockquote = ast.children.find(c => (c as Element).tagName === 'blockquote') as Element;
      expect(blockquote).toBeDefined();
    });

    it('should work in list inside blockquote', () => {
      const md = '> - Item {"test"}';
      const ast = mdxish(md);

      const blockquote = ast.children.find(c => (c as Element).tagName === 'blockquote') as Element;
      expect(blockquote).toBeDefined();
    });
  });
});
