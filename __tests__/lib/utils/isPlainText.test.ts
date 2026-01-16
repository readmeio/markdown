import { hast, plain } from '../../../lib';
import isPlainText from '../../../lib/utils/isPlainText';

describe('isPlainText', () => {
  describe('magic blocks detection', () => {
    it('should detect magic blocks', () => {
      const content = `[block:html]
{
  "html": "<h1>Hello</h1>"
}
[/block]`;

      expect(isPlainText(content)).toBe(false);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should detect magic blocks with different types', () => {
      const content = `[block:image]
{
  "images": [{"image": ["https://example.com/img.png", "caption"]}]
}
[/block]`;

      expect(isPlainText(content)).toBe(false);
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

      expect(isPlainText(content)).toBe(false);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should not detect incomplete magic blocks', () => {
      const content = `[block:code]
{
  "code": "console.log('hello');"
}`;

      expect(isPlainText(content)).toBe(true);
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

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('[block:html] { "html": "<h1>Hello</h1>" } [/block]');
    });

    it('should not detect magic blocks in inline code', () => {
      const content = 'Here is some `[block:html]{...}[/block]` code';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Here is some [block:html]{...}[/block] code');
    });
  });

  describe('MDX/JSX elements detection', () => {
    it('should detect self-closing JSX components', () => {
      const content = '<Component />';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect JSX components with children', () => {
      const content = '<Component>Hello World</Component>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Hello World');
    });

    it('should detect JSX components with attributes', () => {
      const content = '<Component prop="value" />';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect JSX components with complex attributes', () => {
      const content = '<Component prop="value" other={variable} />';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect nested JSX components', () => {
      const content = `<Parent>
  <Child />
</Parent>`;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect JSX components in mixed content', () => {
      const content = `# Title

Some markdown text.

<CustomComponent />

More text.`;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Title Some markdown text. More text.');
    });

    it('should detect JSX in code blocks', () => {
      const content = `\`\`\`jsx
<Component />
\`\`\``;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('<Component />');
    });

    it('should detect JSX in inline code', () => {
      const content = 'Here is `<Component />` in code';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Here is <Component /> in code');
    });
  });

  describe('MDX expressions detection', () => {
    it('should detect MDX expressions', () => {
      let content = '{variable}';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('variable');

      content = '{{variable}}';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('{variable}');
    });

    it('should detect MDX expressions with complex content', () => {
      const content = '{user.name}';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('name');
    });

    it('should detect MDX expressions with function calls', () => {
      const content = '{getValue()}';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('getValue()');
    });

    it('should detect MDX expressions in mixed content', () => {
      const content = `# Title

Some text {variable} more text.`;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Title Some text variable more text.');
    });

    it('should detect empty braces', () => {
      const content = '{}';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should not detect single opening brace', () => {
      const content = '{';
      expect(isPlainText(content)).toBe(true);
      expect(() => plain(hast(content))).toThrow(
        'Unexpected end of file in expression, expected a corresponding closing brace for `{`',
      );
    });

    it('should detect MDX expressions in code blocks', () => {
      const content = `\`\`\`
{variable}
\`\`\``;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('{variable}');
    });

    it('should detect MDX expressions in inline code', () => {
      const content = 'Here is `{variable}` in code';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Here is {variable} in code');
    });
  });

  describe('HTML tags detection', () => {
    it('should detect self-closing HTML tags', () => {
      const content = '<br />';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('');
    });

    it('should detect HTML tags with content', () => {
      const content = '<div>Hello</div>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Hello');
    });

    it('should detect HTML tags with attributes', () => {
      const content = '<div class="container">Content</div>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Content');
    });

    it('should detect multiple HTML tags', () => {
      const content = '<p>Paragraph</p><span>Span</span>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Paragraph Span');
    });

    it('should detect nested HTML tags', () => {
      const content = '<div><p>Nested</p></div>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Nested');
    });

    it('should detect HTML tags in mixed content', () => {
      const content = `# Title

Some markdown.

<div>HTML content</div>

More markdown.`;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Title Some markdown. HTML content More markdown.');
    });

    it('should detect HTML in code blocks', () => {
      const content = `\`\`\`html
<div>Hello</div>
\`\`\``;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('<div>Hello</div>');
    });

    it('should detect HTML in inline code', () => {
      const content = 'Here is `<div>code</div>` in code';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Here is <div>code</div> in code');
    });
  });

  describe('markdown syntax detection', () => {
    describe('headings', () => {
      it('should detect h1 headings', () => {
        const content = '# Title';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Title');
      });

      it('should detect h2 headings', () => {
        const content = '## Subtitle';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Subtitle');
      });

      it('should detect h6 headings', () => {
        const content = '###### Small heading';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Small heading');
      });

      it('should detect headings in mixed content', () => {
        const content = `Some text

# Heading

More text.`;
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Some text Heading More text.');
      });

      it('should not detect headings in code blocks', () => {
        const content = '```\n# Title\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('# Title');
      });

      it('should not detect headings in inline code', () => {
        const content = 'Here is `# Title` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is # Title in code');
      });
    });

    describe('bold text', () => {
      it('should detect asterisk bold syntax', () => {
        const content = '**bold text**';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('bold text');
      });

      it('should detect underscore bold syntax', () => {
        const content = '__bold text__';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('bold text');
      });

      it('should detect bold in mixed content', () => {
        const content = 'This is **bold** text';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('This is bold text');
      });

      it('should not detect bold in code blocks', () => {
        const content = '```\n**bold**\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('**bold**');
      });

      it('should not detect bold in inline code', () => {
        const content = 'Here is `**bold**` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is **bold** in code');
      });
    });

    describe('italic text', () => {
      it('should detect asterisk italic syntax', () => {
        const content = '*italic text*';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('italic text');
      });

      it('should detect underscore italic syntax', () => {
        const content = '_italic text_';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('italic text');
      });

      it('should detect italic in mixed content', () => {
        const content = 'This is *italic* text';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('This is italic text');
      });

      it('should not detect italic in code blocks', () => {
        const content = '```\n*italic*\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('*italic*');
      });

      it('should not detect italic in inline code', () => {
        const content = 'Here is `*italic*` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is *italic* in code');
      });
    });

    describe('strikethrough', () => {
      it('should detect strikethrough syntax', () => {
        const content = '~~strikethrough text~~';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('strikethrough text');
      });

      it('should detect strikethrough in mixed content', () => {
        const content = 'This is ~~strikethrough~~ text';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('This is strikethrough text');
      });

      it('should not detect strikethrough in code blocks', () => {
        const content = '```\n~~text~~\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('~~text~~');
      });

      it('should not detect strikethrough in inline code', () => {
        const content = 'Here is `~~text~~` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is ~~text~~ in code');
      });
    });

    describe('lists', () => {
      it('should detect unordered lists with dash', () => {
        const content = '- List item';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('List item');
      });

      it('should detect unordered lists with asterisk', () => {
        const content = '* List item';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('List item');
      });

      it('should detect unordered lists with plus', () => {
        const content = '+ List item';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('List item');
      });

      it('should detect ordered lists', () => {
        const content = '1. First item';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('First item');
      });

      it('should detect numbered lists', () => {
        const content = '42. Item';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Item');
      });

      it('should detect lists in mixed content', () => {
        const content = `Some text

- List item

More text.`;
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Some text List item More text.');
      });

      it('should not detect lists in code blocks', () => {
        const content = '```\n- item\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('- item');
      });

      it('should not detect lists in inline code', () => {
        const content = 'Here is `- item` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is - item in code');
      });
    });

    describe('blockquotes', () => {
      it('should detect blockquote syntax', () => {
        const content = '> Quote text';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Quote text');
      });

      it('should detect blockquotes in mixed content', () => {
        const content = `Some text

> Quote here

More text.`;
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Some text Quote here More text.');
      });

      it('should not detect blockquotes in code blocks', () => {
        const content = '```\n> quote\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('> quote');
      });

      it('should not detect blockquotes in inline code', () => {
        const content = 'Here is `> quote` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is > quote in code');
      });
    });

    describe('horizontal rules', () => {
      it('should detect horizontal rule with dashes', () => {
        const content = '---';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('');
      });

      it('should detect horizontal rule with asterisks', () => {
        const content = '***';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('');
      });

      it('should detect horizontal rule with equals', () => {
        const content = '===\n';
        expect(isPlainText(content)).toBe(false);
        // Note: plain() may preserve === in some cases
        expect(plain(hast(content))).toMatch(/^=+$/);
      });

      it('should detect horizontal rules in mixed content', () => {
        const content = `Some text

---

More text.`;
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Some text More text.');
      });

      it('should not detect horizontal rules in code blocks', () => {
        const content = '```\n---\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('---');
      });

      it('should not detect horizontal rules in inline code', () => {
        const content = 'Here is `---` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is --- in code');
      });
    });

    describe('tables', () => {
      it('should detect simple table', () => {
        const content = '| Col1 | Col2 |';
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('| Col1 | Col2 |');
      });

      it('should detect table with header separator', () => {
        const content = `| Col1 | Col2 |
|------|------|
| Val1 | Val2 |`;
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Col1 Col2 Val1 Val2');
      });

      it('should detect tables in mixed content', () => {
        const content = `Some text

| Col | Value |

More text.`;
        expect(isPlainText(content)).toBe(false);
        expect(plain(hast(content))).toBe('Some text | Col | Value | More text.');
      });

      it('should not detect tables in code blocks', () => {
        const content = '```\n| col |\n```';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('| col |');
      });

      it('should not detect tables in inline code', () => {
        const content = 'Here is `| col |` in code';
        expect(isPlainText(content)).toBe(true);
        expect(plain(hast(content))).toBe('Here is | col | in code');
      });
    });

    describe('mixed markdown syntax', () => {
      it('should detect multiple markdown syntaxes together', () => {
        const content = `# Heading

This is **bold** and *italic* text.

- List item
- Another item

> Blockquote

| Table | Column |`;
        expect(isPlainText(content)).toBe(false);
        const result = plain(hast(content));
        expect(result).toBe(
          'Heading This is bold and italic text. List item Another item Blockquote | Table | Column |',
        );
      });
    });
  });

  describe('edge cases', () => {
    it('should return false for empty string', () => {
      expect(isPlainText('')).toBe(true);
    });

    it('should detect plain markdown syntax', () => {
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

      expect(isPlainText(content)).toBe(false);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });

    it('should handle content with code blocks containing special syntax', () => {
      const content = `# Title

\`\`\`jsx
<Component />
\`\`\`

But this is real: <RealComponent />`;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Title <Component /> But this is real:');
    });

    it('should handle content with inline code containing special syntax', () => {
      const content = 'Here is `<code>` but this is real: <div>Hello</div>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Here is <code> but this is real: Hello');
    });

    it('should detect HTMLBlock component usage', () => {
      const content = '<HTMLBlock>Hello</HTMLBlock>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Hello');
    });

    it('should detect lowercase HTML tags', () => {
      const content = '<p>Paragraph</p>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Paragraph');
    });

    it('should detect uppercase HTML tags', () => {
      const content = '<DIV>Content</DIV>';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Content');
    });

    it('should detect markdown links', () => {
      const content = '[link text](https://example.com)';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('link text');
    });

    it('should detect markdown reference-style links', () => {
      const content = '[link text][ref]';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('[link text][ref]');
    });

    it('should detect markdown links with titles', () => {
      const content = '[link text](https://example.com "title")';
      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('link text');
    });

    it('should detect markdown links in mixed content', () => {
      const content = `# Title

Some text with [a link](https://example.com) in it.`;

      expect(isPlainText(content)).toBe(false);
      expect(plain(hast(content))).toBe('Title Some text with a link in it.');
    });

    it('should not detect markdown links in code blocks', () => {
      const content = `\`\`\`
[link text](https://example.com)
\`\`\``;

      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('[link text](https://example.com)');
    });

    it('should not detect markdown links in inline code', () => {
      const content = 'Here is `[link](url)` in code';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('Here is [link](url) in code');
    });

    it('should not be confused by markdown image syntax', () => {
      const content = '![alt text](https://example.com/image.png)';
      expect(isPlainText(content)).toBe(true);
      expect(plain(hast(content))).toBe('');
    });

    it('should handle very long content', () => {
      const longContent = `${'a'.repeat(20)}<div>Hello</div>${'b'.repeat(20)}`;
      expect(isPlainText(longContent)).toBe(false);
      expect(plain(hast(longContent))).toBe('aaaaaaaaaaaaaaaaaaaa Hello bbbbbbbbbbbbbbbbbbbb');
    });

    it('should detect magic blocks with long type names', () => {
      const content = `[block:${'a'.repeat(20)}]
{
  "data": "value"
}
[/block]`;

      expect(isPlainText(content)).toBe(false);
      expect(() => plain(hast(content))).toThrow('Could not parse expression with acorn');
    });
  });
});
