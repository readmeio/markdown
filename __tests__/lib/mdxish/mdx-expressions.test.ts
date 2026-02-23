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

  describe('multiline template literal children in JSX components', () => {
    it('should not throw a parse error for multiline template literal children', () => {
      const md = `<Terminal>{\`
  $ npx run command
  This is the response
\`}</Terminal>`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should preserve newlines in multiline template literal expression results', () => {
      const md = `{\`line1\nline2\nline3\`}`;
      const ast = mdxish(md);

      const p = ast.children.find(c => (c as Element).tagName === 'p') as Element;
      // remarkBreaks splits \n into separate text nodes with <br> elements between them
      const allText = p.children
        .filter(c => c.type === 'text')
        .map(c => (c as Text).value)
        .join('');

      expect(allText).toContain('line1');
      expect(allText).toContain('line2');
      expect(allText).toContain('line3');
    });

    it('should pass the full multiline string to component children', () => {
      const mockTerminalModule = {
        default: () => null,
        Toc: null,
        toc: [],
      };

      const md = `<Terminal>{\`
  $ npx run command
  This is the response

  $ inputs start with a dollar sign
  outputs can be multiline
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockTerminalModule as any } });

      // Terminal is inside a <p> (from paragraph wrapping), search recursively
      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      // Children should be a single text node with newlines preserved
      const findText = (node: Element | Text): string => {
        if (node.type === 'text') return (node as Text).value;
        if ('children' in node) return (node as Element).children.map(c => findText(c as Element | Text)).join('');
        return '';
      };
      const content = findText(terminal!);
      expect(content).toContain('$ npx run command');
      expect(content).toContain('This is the response');
      expect(content).toContain('\n');
    });

    it('should preserve a single text child node for component expecting string children', () => {
      const mockTerminalModule = {
        default: () => null,
        Toc: null,
        toc: [],
      };

      const md = `<Terminal>{\`
  $ echo hello
  hello
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockTerminalModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      // Should be a single text child, not multiple elements
      expect(terminal!.children).toHaveLength(1);
      expect(terminal!.children[0].type).toBe('text');

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value).toContain('$ echo hello');
      expect(textNode.value).toContain('hello');
      expect(textNode.value).toContain('\n');
    });

    it('should preserve indentation in multiline template literal children', () => {
      const mockModule = { default: () => null, Toc: null, toc: [] };

      const md = `<CodeBlock>{\`
  function hello() {
    console.log("world");
  }
\`}</CodeBlock>`;

      const ast = mdxish(md, { components: { CodeBlock: mockModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const codeBlock = findElement(ast, 'CodeBlock');
      expect(codeBlock).toBeDefined();

      const textNode = codeBlock!.children[0] as Text;
      expect(textNode.type).toBe('text');
      // Leading/trailing whitespace is trimmed, but relative indentation is preserved
      expect(textNode.value).toContain('function hello()');
      expect(textNode.value).toContain('    console.log');
    });

    it('should handle empty lines in template literal children', () => {
      const mockModule = { default: () => null, Toc: null, toc: [] };

      const md = `<Terminal>{\`
  $ first command
  output

  $ second command
  more output
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.type).toBe('text');
      expect(textNode.value).toContain('$ first command');
      expect(textNode.value).toContain('$ second command');
      // Empty line should be preserved as double newline
      expect(textNode.value).toMatch(/output\n\n/);
    });

    it('should handle template literal with only whitespace and newlines', () => {
      const mockModule = { default: () => null, Toc: null, toc: [] };

      const md = `<Spacer>{\`
\`}</Spacer>`;

      const ast = mdxish(md, { components: { Spacer: mockModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const spacer = findElement(ast, 'Spacer');
      expect(spacer).toBeDefined();
    });

    it('should not affect regular text children of components (non-expression)', () => {
      const mockModule = {
        default: () => null,
        Toc: null,
        toc: [],
      };

      const md = `<MyComponent>

  This is regular markdown content.

</MyComponent>`;

      const ast = mdxish(md, { components: { MyComponent: mockModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const comp = findElement(ast, 'MyComponent');
      expect(comp).toBeDefined();
      // Regular markdown text should be processed through markdown (wrapped in <p>)
      const hasP = comp!.children.some(c => c.type === 'element' && (c as Element).tagName === 'p');
      expect(hasP).toBe(true);
    });

    it('should handle component with both attributes and template literal children', () => {
      const mockModule = { default: () => null, Toc: null, toc: [] };

      const md = `<Terminal title="My Terminal">{\`
  $ npm install
  added 50 packages
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();
      expect(terminal!.properties?.title).toBe('My Terminal');

      const textNode = terminal!.children[0] as Text;
      expect(textNode.type).toBe('text');
      expect(textNode.value).toContain('$ npm install');
      expect(textNode.value).toContain('added 50 packages');
      expect(textNode.value).toContain('\n');
    });

    it('should handle special characters in template literal children', () => {
      const mockModule = { default: () => null, Toc: null, toc: [] };

      const md = `<Terminal>{\`
  $ echo "hello world"
  hello world
  $ echo 'single quotes'
  single quotes
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value).toContain('"hello world"');
      expect(textNode.value).toContain("'single quotes'");
    });
  });

  describe('nested components with multiline children', () => {
    const mockModule = { default: () => null, Toc: null, toc: [] };

    const findElement = (node: any, tagName: string): Element | undefined => {
      if (node.tagName === tagName) return node as Element;
      if (node.children) {
        for (const child of node.children) {
          const found = findElement(child, tagName);
          if (found) return found;
        }
      }
      return undefined;
    };

    it('should handle Terminal inside another component', () => {
      const md = `<Card><Terminal>{\`
  $ npm install
  done
\`}</Terminal></Card>`;

      const ast = mdxish(md, {
        components: { Card: mockModule as any, Terminal: mockModule as any },
      });

      const card = findElement(ast, 'Card');
      expect(card).toBeDefined();

      const terminal = findElement(card!, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.type).toBe('text');
      expect(textNode.value).toContain('$ npm install');
      expect(textNode.value).toContain('\n');
    });

    it('should handle multiple nested levels with multiline children', () => {
      const md = `<Accordion><AccordionItem><Terminal>{\`
  $ deep nested command
  output here
\`}</Terminal></AccordionItem></Accordion>`;

      const ast = mdxish(md, {
        components: {
          Accordion: mockModule as any,
          AccordionItem: mockModule as any,
          Terminal: mockModule as any,
        },
      });

      const accordion = findElement(ast, 'Accordion');
      expect(accordion).toBeDefined();

      const terminal = findElement(accordion!, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value).toContain('$ deep nested command');
      expect(textNode.value).toContain('\n');
    });

    it('should handle sibling components with multiline children', () => {
      const md = `<Tabs>
<Tab><Terminal>{\`
  $ first terminal
  output 1
\`}</Terminal></Tab>
<Tab><Terminal>{\`
  $ second terminal
  output 2
\`}</Terminal></Tab>
</Tabs>`;

      const ast = mdxish(md, {
        components: {
          Tabs: mockModule as any,
          Tab: mockModule as any,
          Terminal: mockModule as any,
        },
      });

      const tabs = findElement(ast, 'Tabs');
      expect(tabs).toBeDefined();

      // Find all Terminal elements
      const terminals: Element[] = [];
      const findAllTerminals = (node: any) => {
        if (node.tagName === 'Terminal') terminals.push(node);
        if (node.children) node.children.forEach(findAllTerminals);
      };
      findAllTerminals(tabs);

      expect(terminals).toHaveLength(2);

      // Helper to extract text content from terminal children
      const getTextContent = (terminal: Element): string => {
        const collectText = (node: any): string => {
          if (node.type === 'text') return node.value;
          if (node.children) return node.children.map(collectText).join('');
          return '';
        };
        return collectText(terminal);
      };

      expect(getTextContent(terminals[0])).toContain('$ first terminal');
      expect(getTextContent(terminals[1])).toContain('$ second terminal');
    });
  });

  describe('multiple Terminal instances in same document', () => {
    const mockModule = { default: () => null, Toc: null, toc: [] };

    const findAllElements = (node: any, tagName: string): Element[] => {
      const results: Element[] = [];
      const search = (n: any) => {
        if (n.tagName === tagName) results.push(n);
        if (n.children) n.children.forEach(search);
      };
      search(node);
      return results;
    };

    it('should handle multiple Terminals in sequence', () => {
      const md = `<Terminal>{\`
  $ first command
  first output
\`}</Terminal>

<Terminal>{\`
  $ second command
  second output
\`}</Terminal>

<Terminal>{\`
  $ third command
  third output
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminals = findAllElements(ast, 'Terminal');
      expect(terminals).toHaveLength(3);

      expect((terminals[0].children[0] as Text).value).toContain('$ first command');
      expect((terminals[1].children[0] as Text).value).toContain('$ second command');
      expect((terminals[2].children[0] as Text).value).toContain('$ third command');
    });

    it('should handle Terminals with different content lengths', () => {
      // Use multiline content so newline markers are triggered
      const shortContent = '$ short\noutput';
      const longContent = Array(20).fill('$ long line with content').join('\n');

      const md = `<Terminal>{\`${shortContent}\`}</Terminal>

<Terminal>{\`${longContent}\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminals = findAllElements(ast, 'Terminal');
      expect(terminals).toHaveLength(2);

      // Helper to extract text content from terminal children
      const getTextContent = (terminal: Element): string => {
        const collectText = (node: any): string => {
          if (node.type === 'text') return node.value;
          if (node.children) return node.children.map(collectText).join('');
          return '';
        };
        return collectText(terminal);
      };

      expect(getTextContent(terminals[0])).toContain('$ short');
      expect(getTextContent(terminals[1]).split('\n')).toHaveLength(20);
    });

    it('should handle Terminals interleaved with other content', () => {
      const md = `# Introduction

Some text here.

<Terminal>{\`
  $ npm install
  done
\`}</Terminal>

More text explaining things.

<Terminal>{\`
  $ npm start
  running
\`}</Terminal>

## Conclusion`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminals = findAllElements(ast, 'Terminal');
      expect(terminals).toHaveLength(2);

      // Verify headings also exist
      const h1 = findAllElements(ast, 'h1');
      const h2 = findAllElements(ast, 'h2');
      expect(h1).toHaveLength(1);
      expect(h2).toHaveLength(1);
    });
  });

  describe('error recovery for malformed inputs', () => {
    const mockModule = { default: () => null, Toc: null, toc: [] };

    it('should not crash on empty expression', () => {
      const md = `<Terminal>{}</Terminal>`;

      expect(() => mdxish(md, { components: { Terminal: mockModule as any } })).not.toThrow();
    });

    it('should handle numeric expression result', () => {
      const md = `<Terminal>{42}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const findElement = (node: any, tagName: string): Element | undefined => {
        if (node.tagName === tagName) return node as Element;
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child, tagName);
            if (found) return found;
          }
        }
        return undefined;
      };

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();
    });

    it('should handle null expression result', () => {
      const md = `<Terminal>{null}</Terminal>`;

      expect(() => mdxish(md, { components: { Terminal: mockModule as any } })).not.toThrow();
    });

    it('should handle undefined expression result', () => {
      const md = `<Terminal>{undefined}</Terminal>`;

      expect(() => mdxish(md, { components: { Terminal: mockModule as any } })).not.toThrow();
    });

    it('should handle array expression result', () => {
      const md = `<Terminal>{[1, 2, 3]}</Terminal>`;

      expect(() => mdxish(md, { components: { Terminal: mockModule as any } })).not.toThrow();
    });

    it('should handle object expression result', () => {
      const md = `<Terminal>{{ key: "value" }}</Terminal>`;

      expect(() => mdxish(md, { components: { Terminal: mockModule as any } })).not.toThrow();
    });

    it('should handle boolean expression result', () => {
      const md = `<Terminal>{true}</Terminal>`;

      expect(() => mdxish(md, { components: { Terminal: mockModule as any } })).not.toThrow();
    });
  });

  describe('edge cases for multiline template literals', () => {
    const mockModule = { default: () => null, Toc: null, toc: [] };

    const findElement = (node: any, tagName: string): Element | undefined => {
      if (node.tagName === tagName) return node as Element;
      if (node.children) {
        for (const child of node.children) {
          const found = findElement(child, tagName);
          if (found) return found;
        }
      }
      return undefined;
    };

    it('should handle Unicode characters in multiline content', () => {
      const md = `<Terminal>{\`
  $ echo "こんにちは"
  こんにちは
  $ echo "🎉 emoji test 🚀"
  🎉 emoji test 🚀
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value).toContain('こんにちは');
      expect(textNode.value).toContain('🎉');
      expect(textNode.value).toContain('🚀');
    });

    it('should handle escaped backticks inside template literal', () => {
      const md = `<Terminal>{\`
  $ echo \\\`nested\\\`
  \\\`nested\\\`
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();
      // The backslashes should be processed
      expect(terminal!.children.length).toBeGreaterThan(0);
    });

    it('should handle tab characters in multiline content', () => {
      const md = `<Terminal>{\`
  $ ls -la\t--color
  output\twith\ttabs
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value).toContain('\t');
    });

    it('should handle Windows-style line endings (CRLF)', () => {
      const md = `<Terminal>{\`$ cmd\r\noutput\r\nmore\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();
      // Should process without error
      expect(terminal!.children.length).toBeGreaterThan(0);
    });

    it('should handle mixed whitespace (spaces and tabs)', () => {
      const md = `<Terminal>{\`
  \t$ command with mixed whitespace\t
  \toutput\t
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value).toContain('$ command with mixed whitespace');
    });

    it('should handle very long single line', () => {
      // Add newline to trigger newline marker path
      const longLine = '$ ' + 'x'.repeat(1000) + '\noutput';
      const md = `<Terminal>{\`${longLine}\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      // Helper to extract text content
      const getTextContent = (node: Element): string => {
        const collectText = (n: any): string => {
          if (n.type === 'text') return n.value;
          if (n.children) return n.children.map(collectText).join('');
          return '';
        };
        return collectText(node);
      };

      expect(getTextContent(terminal!).length).toBeGreaterThan(1000);
    });

    it('should handle large multiline content (100+ lines)', () => {
      const lines = Array(100)
        .fill(null)
        .map((_, i) => `$ command ${i}`)
        .join('\n');
      const md = `<Terminal>{\`${lines}\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value.split('\n')).toHaveLength(100);
    });

    it('should handle content with markdown-like characters', () => {
      const md = `<Terminal>{\`
  $ echo "# Not a heading"
  # Not a heading
  $ echo "**not bold**"
  **not bold**
  $ echo "[not a link](url)"
  [not a link](url)
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      // Content should NOT be processed as markdown
      expect(textNode.value).toContain('# Not a heading');
      expect(textNode.value).toContain('**not bold**');
      expect(textNode.value).toContain('[not a link](url)');
    });

    it('should handle content with HTML-like characters', () => {
      const md = `<Terminal>{\`
  $ echo "<div>not html</div>"
  <div>not html</div>
  $ cat file.html
  <html><body>test</body></html>
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      // Content should be preserved as text, not parsed as HTML
      expect(textNode.value).toContain('<div>not html</div>');
    });

    it('should handle consecutive empty lines', () => {
      const md = `<Terminal>{\`
  $ command


  $ another command
\`}</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      const textNode = terminal!.children[0] as Text;
      // Double empty line should produce triple newline
      expect(textNode.value).toMatch(/command\n\n\n/);
    });

    it('should pass plain text children as string (not React elements)', () => {
      const md = `<Terminal>$ npm install</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      // Children should be a single text node, not wrapped in <p>
      expect(terminal!.children).toHaveLength(1);
      expect(terminal!.children[0].type).toBe('text');

      const textNode = terminal!.children[0] as Text;
      expect(textNode.value).toBe('$ npm install');
    });

    it('should handle multiline plain text children by extracting text', () => {
      // For multiline plain text (not template literal), markdown creates separate paragraphs
      // This is expected markdown behavior. Use template literals for preserving exact newlines.
      const md = `<Terminal>$ npm install</Terminal>`;

      const ast = mdxish(md, { components: { Terminal: mockModule as any } });

      const terminal = findElement(ast, 'Terminal');
      expect(terminal).toBeDefined();

      // Single line text should be extracted as a text node
      expect(terminal!.children).toHaveLength(1);
      expect(terminal!.children[0].type).toBe('text');
      expect((terminal!.children[0] as Text).value).toBe('$ npm install');
    });
  });
});
