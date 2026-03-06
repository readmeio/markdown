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
    { name: '&#160 decimal nbsp', input: 'Hello&#160World', expected: 'Hello\u00a0World' },
    { name: '&#38 decimal ampersand', input: '&#38 test', expected: '& test' },
    { name: '&#60 decimal less-than', input: '1 &#60 2', expected: '1 < 2' },
    { name: '&#62 decimal greater-than', input: '2 &#62 1', expected: '2 > 1' },
    { name: '&#8212 decimal em dash', input: 'one&#8212two', expected: 'one\u2014two' },
    { name: 'multiple &#160', input: 'A&#160&#160B', expected: 'A\u00a0\u00a0B' },
    { name: '&#xa0 hex nbsp', input: 'Hello&#xa0World', expected: 'Hello\u00a0World' },
    { name: '&#xA0 uppercase hex nbsp', input: 'Hello&#xA0World', expected: 'Hello\u00a0World' },
    { name: '&#x26 hex ampersand', input: '&#x26 test', expected: '& test' },
    { name: '&#x3C hex less-than', input: '1 &#x3C 2', expected: '1 < 2' },
    { name: '&#x2014 hex em dash', input: 'one&#x2014two', expected: 'one\u2014two' },
    { name: '&#x2026 hex ellipsis', input: 'Wait&#x2026really?', expected: 'Wait\u2026really?' },
    { name: '&#Xa0 uppercase X prefix', input: 'Hello&#Xa0World', expected: 'Hello\u00a0World' },
    { name: '&#169 decimal copyright', input: '&#169 2025', expected: '\u00a9 2025' },
    { name: '&#xA9 hex copyright', input: '&#xA9 2025', expected: '\u00a9 2025' },
    { name: 'mixed named + decimal + hex', input: '&nbsp&#160&#xa0', expected: '\u00a0\u00a0\u00a0' },
  ])('converts $name', ({ input, expected }) => {
    const tree = mdxish(input);

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toBe(expected);
  });

  it.each([
    { name: 'named entity in inline code', input: 'Use `&nbsp` in HTML', raw: '&nbsp' },
    { name: 'named entity in fenced code block', input: '```\n&nbsp\n```', raw: '&nbsp' },
    { name: 'decimal ref in inline code', input: 'Use `&#160` in HTML', raw: '&#160' },
    { name: 'decimal ref in fenced code block', input: '```\n&#160\n```', raw: '&#160' },
    { name: 'hex ref in inline code', input: 'Use `&#xa0` in HTML', raw: '&#xa0' },
    { name: 'hex ref in fenced code block', input: '```\n&#xa0\n```', raw: '&#xa0' },
  ])('preserves $name', ({ input, raw }) => {
    const json = JSON.stringify(mdxish(input));
    expect(json).toContain(raw);
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

  it('does not double-convert decimal refs with semicolons', () => {
    const tree = mdxish('&#160; &#169;');

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toBe('\u00a0 \u00a9');
  });

  it('does not double-convert hex refs with semicolons', () => {
    const tree = mdxish('&#xa0; &#xA9;');

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toBe('\u00a0 \u00a9');
  });

  it('leaves &# without digits as raw text', () => {
    const tree = mdxish('test&# more');

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toContain('&#');
  });

  it('leaves &#x without hex digits as raw text', () => {
    const tree = mdxish('test&#x more');

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toContain('&#');
  });
});
