import type { Element, Text } from 'hast';

import { mdxish, mix } from '../../../lib';
import { collectNodes, roundTripMdxish } from '../../helpers';

describe('HTML entity tokenizer', () => {
  it.each([
    { name: 'single &nbsp in body text', input: 'Hello&nbspWorld', expected: 'Hello\u00a0World' },
    { name: 'multiple consecutive &nbsp', input: 'A&nbsp&nbsp&nbspB', expected: 'A\u00a0\u00a0\u00a0B' },
    { name: '&nbsp; with semicolon (no double-convert)', input: 'Hello&nbsp;World', expected: 'Hello\u00a0World' },
    { name: '&amp without semicolon', input: 'Tom&ampJerry', expected: 'Tom&Jerry' },
    { name: '&copy without semicolon', input: '&copy 2025', expected: '\u00a9 2025' },
    { name: '&lt without semicolon', input: '1 &lt 2', expected: '1 < 2' },
    { name: '&sect prefix followed by more letters', input: '&sectionId', expected: '\u00a7ionId' },
    { name: '&not prefix followed by more letters', input: '&notit', expected: '\u00acit' },
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

    const codeElement = paragraph.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
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

describe('HTML entity tokenizer: names that require a semicolon', () => {
  const QUERY_STRING = 'api-base-url?partner_code=xxx&partner_key=xxx';

  it.each([
    { name: '&partner_key', input: 'a=1&partner_key=2' },
    { name: '&and', input: 'a=1&and=2' },
    { name: '&api_key', input: 'a=1&api_key=2' },
    { name: '&image', input: 'a=1&image=2' },
    { name: '&int', input: 'a=1&int=2' },
    { name: '&lang', input: 'a=1&lang=en' },
    { name: '&nested', input: 'a=1&nested=2' },
    { name: '&order', input: 'a=1&order=desc' },
    { name: '&prop', input: 'a=1&prop=2' },
    { name: '&scope', input: 'a=1&scope=2' },
    { name: '&startDate', input: 'a=1&startDate=2' },
    { name: '&sum', input: 'a=1&sum=2' },
  ])('leaves $name intact because it is not a legacy entity', ({ input }) => {
    const tree = mdxish(input);

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toBe(input);
  });

  it.each([
    { name: '&part;', input: 'a&part;b', expected: 'a∂b' },
    { name: '&and;', input: 'a&and;b', expected: 'a∧b' },
    { name: '&order;', input: 'a&order;b', expected: 'aℴb' },
  ])('still converts $name when terminated', ({ input, expected }) => {
    const tree = mdxish(input);

    const paragraph = tree.children[0] as Element;
    expect((paragraph.children[0] as Text).value).toBe(expected);
  });

  it('keeps a query string intact in a table cell', () => {
    const tree = mdxish(`| Endpoint |\n| --- |\n| ${QUERY_STRING} |`);

    const cell = collectNodes<Element>(tree, node => node.type === 'element' && (node as Element).tagName === 'td');
    expect(cell).toHaveLength(1);
    expect(cell[0].children).toMatchObject([{ type: 'text', value: QUERY_STRING }]);
  });

  it('keeps a query string intact in a condensed table cell', () => {
    const tree = mdxish(`|Endpoint|\n|-|\n|${QUERY_STRING}|`);

    const cell = collectNodes<Element>(tree, node => node.type === 'element' && (node as Element).tagName === 'td');
    expect(cell[0].children).toMatchObject([{ type: 'text', value: QUERY_STRING }]);
  });

  it.each([
    { name: 'a callout', input: `> 📘 Auth\n>\n> ${QUERY_STRING}` },
    { name: 'a Tabs component', input: `<Tabs>\n  <Tab title="One">\n    ${QUERY_STRING}\n  </Tab>\n</Tabs>` },
    { name: 'a list item', input: `- ${QUERY_STRING}` },
    { name: 'a blockquote with blank lines around it', input: `\n\n> ${QUERY_STRING}\n\n` },
  ])('keeps a query string intact inside $name', ({ input }) => {
    const html = mix(input);

    expect(html).toContain('partner_code=xxx&#x26;partner_key=xxx');
    expect(html).not.toContain('∂');
  });

  it('keeps a query string intact through a serialization round trip', () => {
    expect(roundTripMdxish(`| Endpoint |\n| --- |\n| ${QUERY_STRING} |`)).toMatchInlineSnapshot(`
      "| Endpoint                                       |
      | ---------------------------------------------- |
      | api-base-url?partner_code=xxx\\&partner_key=xxx |
      "
    `);
  });

  it('renders the query string as a single unescaped ampersand', () => {
    expect(mix(QUERY_STRING)).toMatchInlineSnapshot('"<p>api-base-url?partner_code=xxx&#x26;partner_key=xxx</p>"');
  });
});
