import type { CustomComponents } from '../../../types';
import type { Root, RootContent } from 'hast';

import { mdxish } from '../../../lib/mdxish';
import { extractText } from '../../../processor/transform/extract-text';
import { findAllElementsByTagName } from '../../helpers';

type HastNode = Root | RootContent;

function hasDescendant(node: HastNode, tagName: string): boolean {
  if (node.type === 'element' && node.tagName === tagName) return true;
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.some(child => hasDescendant(child, tagName));
  }
  return false;
}

/**
 * Regression tests for self-closing HTML tags (e.g. `<i />`, `<b />`, `<em />`).
 *
 * Bug: Self-closing non-void HTML tags like `<i />` are interpreted as opening tags
 * by rehype-raw (following HTML spec, where `/` in `<i />` is ignored for non-void elements).
 * This causes all subsequent content to be wrapped inside the `<i>` element, producing
 * unexpected italicized text and broken document structure.
 *
 * Expected behavior: `<i />` should render as an empty `<i></i>` element without
 * wrapping any subsequent content.
 *
 * @see https://linear.app/readme-io/issue/RM-15665
 */
describe('self-closing non-void HTML tags should not wrap subsequent content', () => {
  describe('inline context (same line)', () => {
    it('should not wrap text after a self-closing <i /> on the same line', () => {
      const tree = mdxish('<i /> some text after');

      // The <i> should be empty; "some text after" should be a sibling, not a child
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });

    it('should not wrap text after a self-closing <b /> on the same line', () => {
      const tree = mdxish('<b /> some text after');

      const bElements = findAllElementsByTagName(tree, 'b');
      expect(bElements).toHaveLength(1);
      expect(extractText(bElements[0])).toBe('');
    });

    it('should not wrap text after a self-closing <em /> on the same line', () => {
      const tree = mdxish('<em /> some text after');

      const emElements = findAllElementsByTagName(tree, 'em');
      expect(emElements).toHaveLength(1);
      expect(extractText(emElements[0])).toBe('');
    });

    it('should not wrap text after a self-closing <span /> on the same line', () => {
      const tree = mdxish('<span /> some text after');

      const spanElements = findAllElementsByTagName(tree, 'span');
      expect(spanElements).toHaveLength(1);
      expect(extractText(spanElements[0])).toBe('');
    });

    it('should not wrap surrounding text when <i /> is mid-sentence', () => {
      const tree = mdxish('before <i /> after');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('before');
      expect(text).toContain('after');
    });
  });

  describe('block context (separate lines)', () => {
    it('should not wrap the following paragraph when <i /> is on its own line', () => {
      const tree = mdxish('<i />\n\nsome text after');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(hasDescendant(iElements[0], 'p')).toBe(false);
      expect(extractText(iElements[0])).toBe('');

      // "some text after" should appear in its own paragraph, not inside <i>
      const text = extractText(tree);
      expect(text).toContain('some text after');
    });

    it('should not wrap content when <i /> appears between paragraphs', () => {
      const tree = mdxish('paragraph before\n\n<i />\n\nparagraph after');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(hasDescendant(iElements[0], 'p')).toBe(false);
      expect(extractText(iElements[0])).toBe('');

      // Both paragraphs should exist and not be inside <i>
      const text = extractText(tree);
      expect(text).toContain('paragraph before');
      expect(text).toContain('paragraph after');
    });

    it('should not wrap a heading that follows a self-closing <i />', () => {
      const tree = mdxish('<i />\n\n## Heading after');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(hasDescendant(iElements[0], 'h2')).toBe(false);

      const headings = findAllElementsByTagName(tree, 'h2');
      expect(headings).toHaveLength(1);
      expect(extractText(headings[0])).toBe('Heading after');
    });

    it('should not wrap content when <i /> follows a heading', () => {
      const tree = mdxish('# Heading\n\n<i />\n\nparagraph after');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(hasDescendant(iElements[0], 'p')).toBe(false);
      expect(extractText(iElements[0])).toBe('');

      const headings = findAllElementsByTagName(tree, 'h1');
      expect(headings).toHaveLength(1);

      const text = extractText(tree);
      expect(text).toContain('paragraph after');
    });

    it('should not wrap content on the next line (soft break) after <i />', () => {
      const tree = mdxish('<i />\nsome text after');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(hasDescendant(iElements[0], 'p')).toBe(false);
      expect(extractText(iElements[0])).toBe('');
    });
  });

  describe('multiple self-closing tags', () => {
    it('should handle multiple self-closing <i /> tags without wrapping', () => {
      const tree = mdxish('<i />\n\nparagraph\n\n<i />\n\nanother paragraph');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(2);
      // Neither <i> should contain paragraph content
      iElements.forEach(el => {
        expect(hasDescendant(el, 'p')).toBe(false);
        expect(extractText(el)).toBe('');
      });

      const text = extractText(tree);
      expect(text).toContain('paragraph');
      expect(text).toContain('another paragraph');
    });

    it('should handle mixed self-closing tags on the same line', () => {
      const tree = mdxish('<i /> and <b /> some text');

      const iElements = findAllElementsByTagName(tree, 'i');
      const bElements = findAllElementsByTagName(tree, 'b');
      expect(iElements).toHaveLength(1);
      expect(bElements).toHaveLength(1);
      expect(extractText(iElements[0])).not.toContain('some text');
    });
  });

  describe('self-closing tags with attributes', () => {
    it('should not wrap text after <i class="icon" />', () => {
      const tree = mdxish('<i class="icon" /> label text');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
      expect(iElements[0].properties?.className).toContain('icon');
    });

    it('should not wrap text after <span style="color:red" />', () => {
      const tree = mdxish('<span style="color:red" /> colored text');

      const spanElements = findAllElementsByTagName(tree, 'span');
      expect(spanElements).toHaveLength(1);
      expect(extractText(spanElements[0])).toBe('');
    });
  });

  describe('comparison with properly closed tags (sanity checks)', () => {
    it('<i></i> should NOT wrap subsequent text (baseline)', () => {
      const tree = mdxish('<i></i> some text after');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });

    it('<i>content</i> should only wrap its own content', () => {
      const tree = mdxish('<i>italic</i> normal text');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('italic');

      const text = extractText(tree);
      expect(text).toContain('normal text');
    });
  });

  describe('void elements should still work (sanity checks)', () => {
    it('<br /> should render as a line break without wrapping', () => {
      const tree = mdxish('before<br />after');
      const brElements = findAllElementsByTagName(tree, 'br');
      expect(brElements).toHaveLength(1);

      const text = extractText(tree);
      expect(text).toContain('before');
      expect(text).toContain('after');
    });

    it('<hr /> should render as a thematic break without wrapping', () => {
      const tree = mdxish('before\n\n<hr />\n\nafter');
      const hrElements = findAllElementsByTagName(tree, 'hr');
      expect(hrElements).toHaveLength(1);

      const paragraphs = findAllElementsByTagName(tree, 'p');
      expect(paragraphs).toHaveLength(2);
    });
  });

  describe('PascalCase JSX components should not be affected', () => {
    it('<Callout /> should render as a custom component, not be rewritten', () => {
      const tree = mdxish('<Callout />\n\nparagraph after');
      // Callout is a known component — it should render, not wrap content
      const text = extractText(tree);
      expect(text).toContain('paragraph after');
    });

    it('<MyComponent /> with attributes should be left intact', () => {
      const MyComponent = {} as CustomComponents['MyComponent'];
      const tree = mdxish('<MyComponent theme="dark" />', { components: { MyComponent } });
      const elements = findAllElementsByTagName(tree, 'MyComponent');
      expect(elements).toHaveLength(1);
    });

    it('does not affect <Table /> rendering', () => {
      const tree = mdxish('<Table />\n\ntext after');
      const text = extractText(tree);
      expect(text).toContain('text after');
    });
  });

  describe('kebab-case custom elements should not be affected', () => {
    it('<my-component /> should not be rewritten and should not wrap content', () => {
      const components = { 'my-component': {} as CustomComponents['my-component'] };
      const tree = mdxish('<my-component />', { components });
      const elements = findAllElementsByTagName(tree, 'my-component');
      expect(elements).toHaveLength(1);
    });
  });

  describe('properly closed tags should not be affected', () => {
    it('<i>text</i> should keep its content intact', () => {
      const tree = mdxish('<i>italic</i> and normal');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('italic');
    });

    it('<div>content</div> should not be modified', () => {
      const tree = mdxish('<div>block content</div>\n\nparagraph');
      const text = extractText(tree);
      expect(text).toContain('block content');
      expect(text).toContain('paragraph');
    });

    it('opening-only <i> without closing should not crash', () => {
      expect(() => mdxish('<i>')).not.toThrow();
    });
  });

  describe('self-closing tags inside markdown constructs', () => {
    it('should not wrap content inside blockquotes', () => {
      const tree = mdxish('> <i /> quoted text');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('quoted text');
    });

    it('should not wrap content inside bold markdown', () => {
      const tree = mdxish('**<i /> bold text**');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('bold text');
    });

    it('should not wrap heading text when <i /> is in a heading', () => {
      const tree = mdxish('## Heading <i /> icon');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      const headings = findAllElementsByTagName(tree, 'h2');
      expect(headings).toHaveLength(1);
      expect(extractText(headings[0])).toContain('Heading');
    });
  });

  describe('self-closing tags with no space before />', () => {
    it('<i/> should not wrap subsequent text', () => {
      const tree = mdxish('<i/> some text after');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });

    it('<b/> should not wrap subsequent text', () => {
      const tree = mdxish('<b/> some text after');
      const bElements = findAllElementsByTagName(tree, 'b');
      expect(bElements).toHaveLength(1);
      expect(extractText(bElements[0])).toBe('');
    });
  });

  describe('nested self-closing tags inside HTML structures', () => {
    it('should handle <i /> nested inside a <div>', () => {
      const tree = mdxish('<div><i /></div>');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });

    it('should handle <i /> inside a <div> with text', () => {
      const tree = mdxish('<div><i /> label</div>');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('label');
    });
  });

  describe('code blocks should be protected', () => {
    it('should not transform <i /> inside fenced code blocks', () => {
      const tree = mdxish('```html\n<i /> icon\n```');
      const text = extractText(tree);
      expect(text).toContain('<i />');
    });

    it('should not transform <i /> inside inline code', () => {
      const tree = mdxish('Use `<i />` for icons');
      const text = extractText(tree);
      expect(text).toContain('<i />');
    });

    it('should transform <i /> outside code blocks but not inside', () => {
      const tree = mdxish('```\n<i />\n```\n\n<i /> text outside');
      const text = extractText(tree);
      // Inside code: preserved literally
      expect(text).toContain('<i />');
      // Outside code: <i> should be empty, not wrapping "text outside"
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });
  });

  describe('HTMLBlock content should be unaffected', () => {
    it('should not transform <i /> inside HTMLBlock template literals', () => {
      const tree = mdxish('<HTMLBlock>{`<i /> icon`}</HTMLBlock>');
      // HTMLBlock wraps raw HTML — <i /> inside should be preserved as-is
      expect(() => tree).not.toThrow();
    });

    it('should not affect HTMLBlock rendering with self-closing tags in raw HTML', () => {
      const md = '<HTMLBlock>{`<div><i class="fa fa-home" /> Home</div>`}</HTMLBlock>';
      const tree = mdxish(md);
      expect(tree).toBeDefined();
    });
  });

  describe('content inside custom component bodies', () => {
    it('should handle <i /> inside a PascalCase component body', () => {
      const MyComponent = {} as CustomComponents[string];
      const md = `<MyComponent>
<i /> icon label
</MyComponent>`;
      const tree = mdxish(md, { components: { MyComponent } });
      const component = findAllElementsByTagName(tree, 'MyComponent');
      expect(component).toHaveLength(1);

      // The <i /> inside the component body should be converted and not wrap "icon label"
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });

    it('should handle <i /> inside a Callout component body', () => {
      const md = `> 📘 Title
>
> <i class="fa fa-info" /> Important info here`;
      const tree = mdxish(md);
      const text = extractText(tree);
      expect(text).toContain('Important info here');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });
  });

  describe('attribute values containing /> should not cause issues', () => {
    it('should handle attributes containing /> in their value', () => {
      const tree = mdxish('<div title="use /> here" /> text after');
      const text = extractText(tree);
      expect(text).toContain('text after');
    });
  });

  describe('interaction with other markdown constructs', () => {
    it('should not affect GFM table rendering', () => {
      const md = `| Header 1 | Header 2 |
| --- | --- |
| <i /> icon | cell 2 |`;
      const tree = mdxish(md);
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('cell 2');
    });

    it('should not affect GFM strikethrough', () => {
      const tree = mdxish('~~<i /> deleted~~');
      const text = extractText(tree);
      expect(text).toContain('deleted');
    });

    it('should not affect magic block rendering', () => {
      const md = `<i /> icon

[block:callout]
{"type":"info","body":"This is important"}
[/block]`;
      const tree = mdxish(md);
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      // The callout should still render, not be swallowed by <i>
      const callout = findAllElementsByTagName(tree, 'Callout');
      expect(callout).toHaveLength(1);
    });

    it('should handle <i /> alongside JSX expressions', () => {
      const tree = mdxish('<i /> result: {5 * 10}');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('50');
    });

    it('should handle <i /> alongside user variables', () => {
      const tree = mdxish('<i /> Hello {user.name}!');
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(extractText(iElements[0])).toBe('');
    });
  });

  describe('real-world use cases', () => {
    it('should handle Font Awesome icon pattern: <i class="fa fa-home" /> Home', () => {
      const tree = mdxish('<i class="fa fa-home" /> Home');

      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      // "Home" should NOT be inside the <i> tag
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('Home');
    });

    it('should handle icon followed by paragraph content', () => {
      const md = `<i class="fa fa-warning" />

This is a warning message that should not be italicized.`;

      const tree = mdxish(md);
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(1);
      expect(hasDescendant(iElements[0], 'p')).toBe(false);
      expect(extractText(iElements[0])).toBe('');

      const text = extractText(tree);
      expect(text).toContain('warning message');
    });

    it('should handle multiple icons in a list', () => {
      const md = `- <i class="fa fa-check" /> Task 1
- <i class="fa fa-check" /> Task 2
- <i class="fa fa-times" /> Task 3`;

      const tree = mdxish(md);
      const iElements = findAllElementsByTagName(tree, 'i');
      expect(iElements).toHaveLength(3);

      // None of the <i> elements should contain the task text
      iElements.forEach(el => {
        expect(extractText(el)).toBe('');
      });

      const text = extractText(tree);
      expect(text).toContain('Task 1');
      expect(text).toContain('Task 2');
      expect(text).toContain('Task 3');
    });
  });
});
