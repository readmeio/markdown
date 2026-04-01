import { closeSelfClosingHtmlTags } from '../../processor/transform/mdxish/close-self-closing-html-tags';

describe('closeSelfClosingHtmlTags (string-level preprocessor)', () => {
  describe('converts non-void self-closing tags to explicitly closed', () => {
    it('converts <i />', () => {
      expect(closeSelfClosingHtmlTags('<i />')).toBe('<i></i>');
    });

    it('converts <b />', () => {
      expect(closeSelfClosingHtmlTags('<b />')).toBe('<b></b>');
    });

    it('converts <em />', () => {
      expect(closeSelfClosingHtmlTags('<em />')).toBe('<em></em>');
    });

    it('converts <span />', () => {
      expect(closeSelfClosingHtmlTags('<span />')).toBe('<span></span>');
    });

    it('converts <strong />', () => {
      expect(closeSelfClosingHtmlTags('<strong />')).toBe('<strong></strong>');
    });

    it('converts <div />', () => {
      expect(closeSelfClosingHtmlTags('<div />')).toBe('<div></div>');
    });
  });

  describe('preserves attributes', () => {
    it('preserves class attribute', () => {
      expect(closeSelfClosingHtmlTags('<i class="fa fa-home" />')).toBe('<i class="fa fa-home"></i>');
    });

    it('preserves style attribute', () => {
      expect(closeSelfClosingHtmlTags('<span style="color:red" />')).toBe('<span style="color:red"></span>');
    });

    it('preserves multiple attributes', () => {
      expect(closeSelfClosingHtmlTags('<div id="test" class="wrapper" />')).toBe(
        '<div id="test" class="wrapper"></div>',
      );
    });
  });

  describe('does NOT modify void elements', () => {
    it.each(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr', 'param'])(
      'leaves <%s /> unchanged',
      tag => {
        const input = `<${tag} />`;
        expect(closeSelfClosingHtmlTags(input)).toBe(input);
      },
    );

    it('leaves <br /> with no space unchanged', () => {
      expect(closeSelfClosingHtmlTags('<br/>')).toBe('<br/>');
    });

    it('leaves <img /> with attributes unchanged', () => {
      const input = '<img src="test.png" alt="test" />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('does NOT modify PascalCase (JSX) components', () => {
    it('leaves <MyComponent /> unchanged', () => {
      const input = '<MyComponent />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves <Callout /> unchanged', () => {
      const input = '<Callout />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves <Table /> unchanged', () => {
      const input = '<Table />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('does NOT modify custom elements (kebab-case with hyphens)', () => {
    it('leaves <my-component /> unchanged', () => {
      const input = '<my-component />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves <custom-element /> with attributes unchanged', () => {
      const input = '<custom-element class="test" />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('handles inline context', () => {
    it('converts tag with text after on same line', () => {
      expect(closeSelfClosingHtmlTags('<i /> some text')).toBe('<i></i> some text');
    });

    it('converts tag mid-sentence', () => {
      expect(closeSelfClosingHtmlTags('before <i /> after')).toBe('before <i></i> after');
    });

    it('converts multiple tags on same line', () => {
      expect(closeSelfClosingHtmlTags('<i /> and <b /> text')).toBe('<i></i> and <b></b> text');
    });
  });

  describe('handles block context', () => {
    it('converts tag on its own line', () => {
      expect(closeSelfClosingHtmlTags('<i />\n\nsome text')).toBe('<i></i>\n\nsome text');
    });

    it('converts tag between paragraphs', () => {
      expect(closeSelfClosingHtmlTags('para 1\n\n<i />\n\npara 2')).toBe('para 1\n\n<i></i>\n\npara 2');
    });
  });

  describe('protects code blocks', () => {
    it('does not modify self-closing tags inside fenced code blocks', () => {
      const input = '```html\n<i />\n```';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('does not modify self-closing tags inside inline code', () => {
      const input = 'Use `<i />` for icons';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('still converts tags outside code blocks', () => {
      const input = '```html\n<i />\n```\n\n<i /> text';
      expect(closeSelfClosingHtmlTags(input)).toBe('```html\n<i />\n```\n\n<i></i> text');
    });

    it('does not modify tags inside code blocks with language specifiers', () => {
      const input = '```jsx\n<Component />\n<i />\n```';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('handles multiple inline code spans on the same line', () => {
      const input = 'Use `<i />` and `<b />` for styling';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('does not modify tags inside multiple code blocks interspersed with content', () => {
      const input = '```\n<i />\n```\n\n<b /> between\n\n```\n<span />\n```\n\n<em /> end';
      expect(closeSelfClosingHtmlTags(input)).toBe(
        '```\n<i />\n```\n\n<b></b> between\n\n```\n<span />\n```\n\n<em></em> end',
      );
    });
  });

  describe('does NOT modify tags with content (non-self-closing)', () => {
    it('leaves <i>text</i> unchanged', () => {
      const input = '<i>italic text</i>';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves <div>content</div> unchanged', () => {
      const input = '<div>content</div>';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves opening-only tags unchanged', () => {
      const input = '<i>';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves closing-only tags unchanged', () => {
      const input = '</i>';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves nested HTML unchanged', () => {
      const input = '<div><span>nested</span></div>';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('whitespace variations around />', () => {
    it('converts tag with no space before />', () => {
      expect(closeSelfClosingHtmlTags('<i/>')).toBe('<i></i>');
    });

    it('converts tag with multiple spaces before />', () => {
      expect(closeSelfClosingHtmlTags('<i   />')).toBe('<i></i>');
    });

    it('converts tag with tab before />', () => {
      expect(closeSelfClosingHtmlTags('<i\t/>')).toBe('<i></i>');
    });
  });

  describe('single-letter and short tag names', () => {
    it('converts <a />', () => {
      expect(closeSelfClosingHtmlTags('<a />')).toBe('<a></a>');
    });

    it('converts <p />', () => {
      expect(closeSelfClosingHtmlTags('<p />')).toBe('<p></p>');
    });

    it('converts <s />', () => {
      expect(closeSelfClosingHtmlTags('<s />')).toBe('<s></s>');
    });

    it('converts <u />', () => {
      expect(closeSelfClosingHtmlTags('<u />')).toBe('<u></u>');
    });
  });

  describe('block-level HTML elements', () => {
    it.each(['section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'figure', 'blockquote', 'table', 'form'])(
      'converts <%s />',
      tag => {
        expect(closeSelfClosingHtmlTags(`<${tag} />`)).toBe(`<${tag}></${tag}>`);
      },
    );
  });

  describe('heading-level elements', () => {
    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])(
      'converts <%s />',
      tag => {
        expect(closeSelfClosingHtmlTags(`<${tag} />`)).toBe(`<${tag}></${tag}>`);
      },
    );
  });

  describe('attributes with special patterns', () => {
    it('preserves data-* attributes', () => {
      expect(closeSelfClosingHtmlTags('<div data-testid="value" />')).toBe('<div data-testid="value"></div>');
    });

    it('preserves aria-* attributes', () => {
      expect(closeSelfClosingHtmlTags('<div aria-label="description" />')).toBe('<div aria-label="description"></div>');
    });

    it('preserves single-quoted attributes', () => {
      expect(closeSelfClosingHtmlTags("<i class='icon' />")).toBe("<i class='icon'></i>");
    });

    it('preserves attributes with equals in value', () => {
      expect(closeSelfClosingHtmlTags('<div data-math="1=2" />')).toBe('<div data-math="1=2"></div>');
    });

    it('preserves empty attribute values', () => {
      expect(closeSelfClosingHtmlTags('<div class="" />')).toBe('<div class=""></div>');
    });

    it('preserves attributes containing angle brackets in entity form', () => {
      expect(closeSelfClosingHtmlTags('<div title="&lt;tag&gt;" />')).toBe('<div title="&lt;tag&gt;"></div>');
    });
  });

  describe('does NOT modify PascalCase JSX components with attributes', () => {
    it('leaves <Callout theme="info" /> unchanged', () => {
      const input = '<Callout theme="info" />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves <CodeTabs /> unchanged', () => {
      const input = '<CodeTabs />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('leaves <MyComponent prop={value} /> unchanged', () => {
      const input = '<MyComponent prop={value} />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('correctly converts self-closing tags next to PascalCase components', () => {
    it('converts <i /> but leaves <Callout /> in the same content', () => {
      const input = '<i /> text\n\n<Callout />';
      expect(closeSelfClosingHtmlTags(input)).toBe('<i></i> text\n\n<Callout />');
    });

    it('converts <span /> inside a PascalCase component body', () => {
      const input = '<MyComponent>\n<span /> text\n</MyComponent>';
      expect(closeSelfClosingHtmlTags(input)).toBe('<MyComponent>\n<span></span> text\n</MyComponent>');
    });
  });

  describe('nested self-closing tags inside HTML', () => {
    it('converts self-closing tag nested inside another element', () => {
      expect(closeSelfClosingHtmlTags('<div><i /></div>')).toBe('<div><i></i></div>');
    });

    it('converts multiple nested self-closing tags', () => {
      expect(closeSelfClosingHtmlTags('<div><i /><b /></div>')).toBe('<div><i></i><b></b></div>');
    });
  });

  describe('does NOT match false positives', () => {
    it('does not match text that looks like a tag but is not', () => {
      const input = 'Use the formula x < 5 / 2 > result';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('does not match arrow functions or comparison operators', () => {
      const input = 'if (a < b && c /> 0) {}';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('does not match tags starting with numbers', () => {
      const input = '<1tag />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });

    it('does not match uppercase-only tags', () => {
      const input = '<DIV />';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('markdown context', () => {
    it('converts inside blockquote markers', () => {
      expect(closeSelfClosingHtmlTags('> <i /> text')).toBe('> <i></i> text');
    });

    it('converts inside table cells', () => {
      expect(closeSelfClosingHtmlTags('| <i /> cell |')).toBe('| <i></i> cell |');
    });

    it('converts inside bold/emphasis markdown', () => {
      expect(closeSelfClosingHtmlTags('**<i /> bold**')).toBe('**<i></i> bold**');
    });

    it('converts inside markdown links', () => {
      expect(closeSelfClosingHtmlTags('[<i /> icon](url)')).toBe('[<i></i> icon](url)');
    });

    it('converts inside heading markdown', () => {
      expect(closeSelfClosingHtmlTags('## Heading <i /> icon')).toBe('## Heading <i></i> icon');
    });
  });

  describe('multiple code blocks', () => {
    it('protects tags in multiple fenced code blocks', () => {
      const input = '```\n<i />\n```\n\n<b /> text\n\n```\n<span />\n```';
      expect(closeSelfClosingHtmlTags(input)).toBe('```\n<i />\n```\n\n<b></b> text\n\n```\n<span />\n```');
    });

    it('protects tags in code blocks with language specifiers', () => {
      const input = '```jsx\n<i />\n```';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('attribute values containing />', () => {
    it('does not break when attribute value contains />', () => {
      expect(closeSelfClosingHtmlTags('<div title="use /> here" />')).toBe('<div title="use /> here"></div>');
    });

    it('handles single-quoted attribute value containing />', () => {
      expect(closeSelfClosingHtmlTags("<div title='use /> here' />")).toBe("<div title='use /> here'></div>");
    });

    it('handles multiple attributes where one contains />', () => {
      expect(closeSelfClosingHtmlTags('<div title="use /> here" class="test" />')).toBe(
        '<div title="use /> here" class="test"></div>',
      );
    });

    it('handles attribute value containing a self-closing tag pattern', () => {
      expect(closeSelfClosingHtmlTags('<span data-tooltip="<i /> icon" />')).toBe(
        '<span data-tooltip="<i /> icon"></span>',
      );
    });
  });

  describe('HTMLBlock template literal content', () => {
    it('does not modify tags inside HTMLBlock template literals (protected as code)', () => {
      const input = '<HTMLBlock>{`<i /> icon`}</HTMLBlock>';
      expect(closeSelfClosingHtmlTags(input)).toBe(input);
    });
  });

  describe('content inside custom component bodies', () => {
    it('converts self-closing tags inside component children', () => {
      const input = '<MyComponent>\n<i /> icon text\n</MyComponent>';
      expect(closeSelfClosingHtmlTags(input)).toBe('<MyComponent>\n<i></i> icon text\n</MyComponent>');
    });

    it('converts self-closing tags inside nested components', () => {
      const input = '<Wrapper>\n<Inner>\n<i /> label\n</Inner>\n</Wrapper>';
      expect(closeSelfClosingHtmlTags(input)).toBe('<Wrapper>\n<Inner>\n<i></i> label\n</Inner>\n</Wrapper>');
    });
  });

  describe('HTML comments', () => {
    it('converts self-closing tags inside HTML comments (harmless, comments are stripped)', () => {
      // HTML comments are not code-protected, so <i /> inside gets converted.
      // This is harmless because comments are stripped during processing.
      const input = '<!-- <i /> -->';
      const result = closeSelfClosingHtmlTags(input);
      expect(result).toBe('<!-- <i></i> -->');
    });
  });

  describe('magic block JSON content', () => {
    it('does not break magic block JSON that happens to contain tag-like patterns', () => {
      const input = '[block:callout]\n{"type":"info","body":"Use <i /> for icons"}\n[/block]';
      const result = closeSelfClosingHtmlTags(input);
      // The <i /> inside JSON body is converted — this is intended because
      // the magic block transformer handles the JSON before HTML parsing
      expect(result).toContain('[block:callout]');
      expect(result).toContain('[/block]');
    });
  });

  describe('real-world patterns', () => {
    it('Font Awesome icon with label', () => {
      expect(closeSelfClosingHtmlTags('<i class="fa fa-home" /> Home')).toBe('<i class="fa fa-home"></i> Home');
    });

    it('multiple icons in list items', () => {
      const input = `- <i class="fa fa-check" /> Task 1
- <i class="fa fa-check" /> Task 2`;
      const expected = `- <i class="fa fa-check"></i> Task 1
- <i class="fa fa-check"></i> Task 2`;
      expect(closeSelfClosingHtmlTags(input)).toBe(expected);
    });

    it('icon followed by paragraph', () => {
      const input = '<i class="fa fa-warning" />\n\nThis is a warning.';
      const expected = '<i class="fa fa-warning"></i>\n\nThis is a warning.';
      expect(closeSelfClosingHtmlTags(input)).toBe(expected);
    });
  });
});
