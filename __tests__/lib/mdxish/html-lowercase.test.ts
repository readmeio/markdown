import { describe, expect, it } from 'vitest';

import { mdxish } from '../../../lib';
import { collectNodes, parseMdxish, parseMdxishWithSource } from '../../helpers';

describe('html-lowercase tokenizer', () => {
  describe('captures the whole tag as one html mdast node', () => {
    // Single-line inline tags at block level fall through to CommonMark's
    // paragraph path; the text variant then claims them during inline
    // parsing. The flow variant only kicks in for genuinely multi-line tags
    // (open tag or body continuation across lines).
    it('quoted attribute value', () => {
      const { tree } = parseMdxishWithSource('<a href="https://example.com">Example</a>');
      expect(tree.children).toMatchObject([{
        type: 'paragraph',
        children: [{ type: 'html', value: '<a href="https://example.com">Example</a>' }],
      }]);
    });

    it('unquoted URL attribute (the baseline bug fix)', () => {
      const { tree } = parseMdxishWithSource('<a href=https://example.com>Example</a>');
      expect(tree.children).toMatchObject([{
        type: 'paragraph',
        children: [{ type: 'html', value: '<a href=https://example.com>Example</a>' }],
      }]);
    });

    it('unbalanced `{` after `=` stays as a literal unquoted value', () => {
      const { tree } = parseMdxishWithSource('<a href={unclosed>Example</a>');
      expect(tree.children).toMatchObject([{
        type: 'paragraph',
        children: [{ type: 'html', value: '<a href={unclosed>Example</a>' }],
      }]);
    });

    it('void element <img> without explicit self-close', () => {
      const { tree } = parseMdxishWithSource('<img src=https://example.com/a.png alt="Alt">');
      expect(tree.children).toMatchObject([{
        type: 'paragraph',
        children: [{ type: 'html', value: '<img src=https://example.com/a.png alt="Alt">' }],
      }]);
    });
  });

  describe('produces the expected hast element', () => {
    // Single-line inline tags render inside a `<p>` wrapper (same as any
    // inline content at block level), so the tag lives at children[0]
    // inside the paragraph.
    const firstChildOf = (tree: ReturnType<typeof mdxish>) =>
      (tree.children[0] as { children: unknown[] }).children[0];

    it('parses unquoted <a> href, text child, and "Example" value', () => {
      const tree = mdxish('<a href=https://example.com>Example</a>');
      expect(firstChildOf(tree)).toMatchObject({
        type: 'element',
        tagName: 'a',
        properties: { href: 'https://example.com' },
        children: [{ type: 'text', value: 'Example' }],
      });
    });

    it('parses <img> with mixed quoted/unquoted attributes', () => {
      const tree = mdxish('<img src=https://example.com/a.png alt="Alt text">');
      expect(firstChildOf(tree)).toMatchObject({
        type: 'element',
        tagName: 'img',
        properties: { src: 'https://example.com/a.png', alt: 'Alt text' },
      });
    });

    it('parses self-closing <img />', () => {
      // A single valid self-closing tag on its own line is claimed by
      // CommonMark's html-flow type-7 (a full-line "complete tag" match),
      // so the hast element sits at the root rather than inside a <p>.
      const tree = mdxish('<img src="x.png" alt="Alt" />');
      expect(tree.children[0]).toMatchObject({
        tagName: 'img',
        properties: { src: 'x.png', alt: 'Alt' },
      });
    });
  });

  describe('does not break surrounding markdown', () => {
    it('inline tag inside a paragraph preserves leading / trailing text', () => {
      const md = 'Start <a href=https://example.com>here</a> end.';
      const tree = parseMdxish(md);

      expect(tree.children).toMatchObject([{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Start ' },
          { type: 'html', value: '<a href=https://example.com>here</a>' },
          { type: 'text', value: ' end.' },
        ],
      }]);
    });

    it('tag that is only 1 line below a sentence should still be treated as inline', () => {
      const md = `Start
<a href="https://example.com">here</a>
end.
      `;
      const tree = parseMdxish(md);

      // Soft breaks serialize as `\n` inside the adjacent text nodes — that's
      // native mdast behavior, rendered as a space in the final HTML output.
      expect(tree.children).toMatchObject([{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Start\n' },
          { type: 'html', value: '<a href="https://example.com">here</a>' },
          { type: 'text', value: '\nend.' },
        ],
      }]);
    });

    it('tag that has attribute expression should be treated as inline', () => {
      const md = `Start
<a href={"https://example.com"}>here</a>
end`;
      const tree = parseMdxish(md);
      expect(tree.children).toMatchObject([{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Start\n' },
          {
            type: 'mdxJsxTextElement',
            name: 'a',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'href',
                value: { type: 'mdxJsxAttributeValueExpression', value: '"https://example.com"' },
              },
            ],
            children: [{ type: 'text', value: 'here' }],
          },
          { type: 'text', value: '\nend' },
        ],
      }]);
    });

    it('evaluates inline brace-attribute expressions end-to-end (hast)', () => {
      const hast = mdxish('before <a href={"https://example.com"}>link</a> after');
      const paragraph = hast.children[0] as { children: { properties?: Record<string, unknown>; tagName?: string; type: string; }[] };
      const anchor = paragraph.children.find(c => c.type === 'element' && c.tagName === 'a');
      expect(anchor).toBeDefined();
      expect(anchor!.properties).toMatchObject({ href: 'https://example.com' });
    });

    it('inline tag adjacent to markdown emphasis', () => {
      const tree = parseMdxish('**bold** <a href=https://x.com>link</a> *italic*');

      const paragraphs = collectNodes(tree, 'paragraph');
      expect(paragraphs).toHaveLength(1);
      expect(collectNodes(paragraphs[0], 'strong')).toHaveLength(1);
      expect(collectNodes(paragraphs[0], 'emphasis')).toHaveLength(1);
      expect(collectNodes(paragraphs[0], 'html').length).toBeGreaterThan(0);
    });

    it('defers type-6 block tags (<div>) to CommonMark', () => {
      // `<div>` is a CommonMark type-6 tag — this tokenizer must NOT claim it,
      // otherwise figure/figcaption reassembly and html-flow termination break.
      const { tree } = parseMdxishWithSource('<div>inner</div>');
      expect(tree.children[0]).toMatchObject({ type: 'html' });
      // The trailing content / siblings are still handled by CommonMark's
      // html-flow logic, which is what the rest of the pipeline expects.
    });

    it('two blank line separated tags should be treated as not inline', () => {
      const md = `<a href="https://example.com">Example</a>

<a href="https://example.com">Example</a>
      `;
      const tree = parseMdxish(md);
      expect(tree.children).toMatchObject([
        { type: 'paragraph', children: [{ type: 'html', value: '<a href="https://example.com">Example</a>' }] },
        { type: 'paragraph', children: [{ type: 'html', value: '<a href="https://example.com">Example</a>' }] },
      ]);
    });
  });
});
