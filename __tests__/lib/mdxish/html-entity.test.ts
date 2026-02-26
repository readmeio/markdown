import type { Element, Text } from 'hast';

import { mdxish } from '../../../lib/mdxish';

describe('HTML entity tokenizer', () => {
  it.each([
    { name: 'single &nbsp in body text', input: 'Hello&nbspWorld', expected: 'Hello\u00a0World' },
    { name: 'multiple consecutive &nbsp', input: 'A&nbsp&nbsp&nbspB', expected: 'A\u00a0\u00a0\u00a0B' },
    { name: '&nbsp; with semicolon (no double-convert)', input: 'Hello&nbsp;World', expected: 'Hello\u00a0World' },
    { name: '&amp without semicolon', input: 'Tom&ampJerry', expected: 'Tom&Jerry' },
    { name: '&copy without semicolon', input: '&copy 2025', expected: '\u00a9 2025' },
    { name: '&hellip without semicolon', input: 'Wait&hellip really?', expected: 'Wait\u2026 really?' },
    { name: '&mdash without semicolon', input: 'one&mdash two', expected: 'one\u2014 two' },
    { name: '&ndash without semicolon', input: '1&ndash10', expected: '1\u201310' },
    { name: '&lt without semicolon', input: '1 &lt 2', expected: '1 < 2' },
    { name: '&gt without semicolon', input: '2 &gt 1', expected: '2 > 1' },
    { name: '&quot without semicolon', input: '&quot hello &quot', expected: '" hello "' },
  ])('converts $name', ({ input, expected }) => {
    const tree = mdxish(input);

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toBe(expected);
  });

  it.each([
    { name: 'single-backtick inline code', input: 'Use `&nbsp` in HTML' },
    { name: 'double-backtick inline code', input: 'Use ``&nbsp`` in HTML' },
    { name: 'backtick-fenced code block', input: '```\n&nbsp\n```' },
    { name: 'tilde-fenced code block', input: '~~~\n&nbsp\n~~~' },
  ])('preserves entities inside $name', ({ input }) => {
    const json = JSON.stringify(mdxish(input));
    expect(json).toContain('&nbsp');
    expect(json).not.toContain('&nbsp;');
  });

  it('converts body text entities while preserving code entities in the same document', () => {
    const tree = mdxish('Text&nbsphere and `&nbsp` in code');

    const paragraph = tree.children[0] as Element;
    const textNode = paragraph.children[0] as Text;
    expect(textNode.value).toContain('\u00a0');

    const codeElement = paragraph.children.find(
      (c): c is Element => c.type === 'element' && c.tagName === 'code',
    );
    expect((codeElement!.children[0] as Text).value).toBe('&nbsp');
  });

  it('leaves invalid entity names as raw text', () => {
    const tree = mdxish('Hello&xyzzy World');

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toContain('&xyzzy');
  });

  it('leaves text unchanged when name exceeds max entity length', () => {
    const name = 'a'.repeat(33);
    const tree = mdxish(`&${name} next`);

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toContain(`&${name}`);
  });

  it('does not double-convert entities with semicolons', () => {
    const tree = mdxish('&amp; &copy; &hellip;');

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toBe('& \u00a9 \u2026');
  });
});
