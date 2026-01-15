import { hast, plain } from '../../../lib';
import { isPlainText } from '../../../lib/utils/isPlainText';

describe('isPlainText', () => {
  describe('magic blocks detection', () => {
    it('should detect magic blocks', () => {
      const content = `[block:html]
{
  "html": "<h1>Hello</h1>"
}
[/block]`;

      expect(isPlainText(content)).toBe(true);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should detect magic blocks with different types', () => {
      const content = `[block:image]
{
  "images": [{"image": ["https://example.com/img.png", "caption"]}]
}
[/block]`;

      expect(isPlainText(content)).toBe(true);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should detect magic blocks in mixed content', () => {
      const content = `# Title

Some text here.

[block:code]
{
  "code": "console.log('hello');"
}
[/block]

More text.`;

      expect(isPlainText(content)).toBe(true);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should not detect incomplete magic blocks', () => {
      const content = `[block:code]
{
  "code": "console.log('hello');"
}`;

      expect(isPlainText(content)).toBe(false);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should detect magic blocks in code blocks', () => {
      const content = `\`\`\`
[block:html]
{
  "html": "<h1>Hello</h1>"
}
[/block]
\`\`\``;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('[block:html] { "html": "<h1>Hello</h1>" } [/block]');
    });

    it('should not detect magic blocks in inline code', () => {
      const content = 'Here is some `[block:html]{...}[/block]` code';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Here is some [block:html]{...}[/block] code');
    });
  });

  describe('MDX/JSX elements detection', () => {
    it('should detect self-closing JSX components', () => {
      const content = '<Component />';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect JSX components with children', () => {
      const content = '<Component>Hello World</Component>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Hello World');
    });

    it('should detect JSX components with attributes', () => {
      const content = '<Component prop="value" />';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect JSX components with complex attributes', () => {
      const content = '<Component prop="value" other={variable} />';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect nested JSX components', () => {
      const content = `<Parent>
  <Child />
</Parent>`;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect JSX components in mixed content', () => {
      const content = `# Title

Some markdown text.

<CustomComponent />

More text.`;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Title Some markdown text. More text.');
    });

    it('should detect JSX in code blocks', () => {
      const content = `\`\`\`jsx
<Component />
\`\`\``;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('<Component />');
    });

    it('should detect JSX in inline code', () => {
      const content = 'Here is `<Component />` in code';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Here is <Component /> in code');
    });
  });

  describe('MDX expressions detection', () => {
    it('should detect MDX expressions', () => {
      let content = '{variable}';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('variable');

      content = '{{variable}}';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('{variable}');
    });

    it('should detect MDX expressions with complex content', () => {
      const content = '{user.name}';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('name');
    });

    it('should detect MDX expressions with function calls', () => {
      const content = '{getValue()}';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('getValue()');
    });

    it('should detect MDX expressions in mixed content', () => {
      const content = `# Title

Some text {variable} more text.`;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Title Some text variable more text.');
    });

    it('should not detect empty braces', () => {
      const content = '{}';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should not detect single opening brace', () => {
      const content = '{';
      expect(isPlainText(content)).toBe(false);
      expect(() => plain(hast(content))).toThrow(
        'Unexpected end of file in expression, expected a corresponding closing brace for `{`',
      );
    });

    it('should detect MDX expressions in code blocks', () => {
      const content = `\`\`\`
{variable}
\`\`\``;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('{variable}');
    });

    it('should detect MDX expressions in inline code', () => {
      const content = 'Here is `{variable}` in code';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Here is {variable} in code');
    });
  });

  describe('HTML tags detection', () => {
    it('should detect self-closing HTML tags', () => {
      const content = '<br />';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect HTML tags with content', () => {
      const content = '<div>Hello</div>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Hello');
    });

    it('should detect HTML tags with attributes', () => {
      const content = '<div class="container">Content</div>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Content');
    });

    it('should detect multiple HTML tags', () => {
      const content = '<p>Paragraph</p><span>Span</span>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Paragraph Span');
    });

    it('should detect nested HTML tags', () => {
      const content = '<div><p>Nested</p></div>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Nested');
    });

    it('should detect HTML tags in mixed content', () => {
      const content = `# Title

Some markdown.

<div>HTML content</div>

More markdown.`;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Title Some markdown. HTML content More markdown.');
    });

    it('should detect HTML in code blocks', () => {
      const content = `\`\`\`html
<div>Hello</div>
\`\`\``;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('<div>Hello</div>');
    });

    it('should detect HTML in inline code', () => {
      const content = 'Here is `<div>code</div>` in code';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Here is <div>code</div> in code');
    });
  });

  describe('edge cases', () => {
    it('should return false for empty string', () => {
      expect(isPlainText('')).toBe(false);
    });

    it('should return false for plain markdown', () => {
      const content = `# Title

This is just plain markdown text.

- List item 1
- List item 2

**Bold** and *italic* text.`;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe(
        'Title This is just plain markdown text. List item 1 List item 2 Bold and italic text.',
      );
    });

    it('should detect content with multiple special types', () => {
      const content = `[block:html]
{
  "html": "<div>Hello</div>"
}
[/block]

<Component />

{variable}`;

      expect(isPlainText(content)).toBe(true);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should handle content with code blocks containing special syntax', () => {
      const content = `# Title

\`\`\`jsx
<Component />
\`\`\`

But this is real: <RealComponent />`;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Title <Component /> But this is real:');
    });

    it('should handle content with inline code containing special syntax', () => {
      const content = 'Here is `<code>` but this is real: <div>Hello</div>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Here is <code> but this is real: Hello');
    });

    it('should detect HTMLBlock component usage', () => {
      const content = '<HTMLBlock>Hello</HTMLBlock>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Hello');
    });

    it('should detect lowercase HTML tags', () => {
      const content = '<p>Paragraph</p>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Paragraph');
    });

    it('should detect uppercase HTML tags', () => {
      const content = '<DIV>Content</DIV>';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Content');
    });

    it('should detect markdown links', () => {
      const content = '[link text](https://example.com)';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('link text');
    });

    it('should detect markdown reference-style links', () => {
      const content = '[link text][ref]';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('[link text][ref]');
    });

    it('should detect markdown links with titles', () => {
      const content = '[link text](https://example.com "title")';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('link text');
    });

    it('should detect markdown links in mixed content', () => {
      const content = `# Title

Some text with [a link](https://example.com) in it.`;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Title Some text with a link in it.');
    });

    it('should not detect markdown links in code blocks', () => {
      const content = `\`\`\`
[link text](https://example.com)
\`\`\``;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('[link text](https://example.com)');
    });

    it('should not detect markdown links in inline code', () => {
      const content = 'Here is `[link](url)` in code';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Here is [link](url) in code');
    });

    it('should not be confused by markdown image syntax', () => {
      const content = '![alt text](https://example.com/image.png)';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should handle very long content', () => {
      const longContent = `${'a'.repeat(20)}<div>Hello</div>${'b'.repeat(20)}`;
      expect(isPlainText(longContent)).toBe(true);
      expect(plain(hast(longContent))).toBe('aaaaaaaaaaaaaaaaaaaa Hello bbbbbbbbbbbbbbbbbbbb');
    });

    it('should detect magic blocks with long type names', () => {
      const content = `[block:${'a'.repeat(20)}]
{
  "data": "value"
}
[/block]`;

      expect(isPlainText(content)).toBe(true);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });
  });
});
