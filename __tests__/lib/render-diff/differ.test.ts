import { describe, expect, it } from 'vitest';

import { diff } from '../../../lib/render-diff';

describe('diff()', () => {
  describe('match cases', () => {
    it('returns { status: "match" } for identical inputs (content-hash fast-path)', () => {
      const html = '<div><p>Hello world</p></div>';
      const result = diff(html, html);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('returns { status: "match" } for byte-identical inputs via fast-path', () => {
      const html = '<section><h1>Title</h1><p>Body</p></section>';
      const result = diff(html, html);
      expect(result).toStrictEqual({ status: 'match' });
      // Confirm it is exactly { status: 'match' } with no severity or changes keys
      expect(Object.keys(result)).toStrictEqual(['status']);
    });

    it('returns { status: "match" } when inputs differ only in collapsible whitespace', () => {
      const a = '<p>  hello   world  </p>';
      const b = '<p>hello world</p>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('returns { status: "match" } when inputs differ only in attribute order', () => {
      const a = '<div class="foo bar" id="x"></div>';
      const b = '<div id="x" class="foo bar"></div>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('returns { status: "match" } when inputs differ only in class sort order', () => {
      const a = '<div class="beta alpha gamma"></div>';
      const b = '<div class="alpha beta gamma"></div>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('returns { status: "match" } for structurally identical HTML with noise attrs dropped', () => {
      const a = '<div data-reactroot=""><p>text</p></div>';
      const b = '<div><p>text</p></div>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('match result has exactly one key (no severity/changes on match)', () => {
      const html = '<p>hello</p>';
      const result = diff(html, html);
      expect(result.status).toBe('match');
      expect('severity' in result).toBe(false);
      expect('changes' in result).toBe(false);
    });
  });

  describe('differ cases', () => {
    it('returns status: "differ" with an "extra"-kind change when the right input has an extra element', () => {
      const leftHtml = '<div><span>x</span></div>';
      const rightHtml = '<div><span>x</span><em>y</em></div>';
      const result = diff(leftHtml, rightHtml);
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      expect(result.changes.length).toBeGreaterThan(0);
      const extraChange = result.changes.find(c => c.kind === 'extra');
      expect(extraChange).toBeDefined();
      expect(extraChange?.left).toBeNull();
      expect(extraChange?.right).toContain('<em');
    });

    it('returns status: "differ" with a "missing"-kind change when the left input has an extra element', () => {
      const leftHtml = '<div><span>x</span><em>y</em></div>';
      const rightHtml = '<div><span>x</span></div>';
      const result = diff(leftHtml, rightHtml);
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      const missingChange = result.changes.find(c => c.kind === 'missing');
      expect(missingChange).toBeDefined();
      expect(missingChange?.right).toBeNull();
      expect(missingChange?.left).toContain('<em');
    });

    it('returns status: "differ" with a text-kind change of severity "content" for text differences', () => {
      const result = diff('<p>hello</p>', '<p>world</p>');
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      const textChange = result.changes.find(c => c.kind === 'text');
      expect(textChange).toBeDefined();
      expect(textChange?.severity).toBe('content');
      expect(textChange?.left).toBe('hello');
      expect(textChange?.right).toBe('world');
    });

    it('returns status: "differ" with a "structural" severity for a tag mismatch', () => {
      const result = diff('<div><p>content</p></div>', '<div><span>content</span></div>');
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      const tagChange = result.changes.find(c => c.kind === 'tag');
      expect(tagChange).toBeDefined();
      expect(tagChange?.severity).toBe('structural');
    });

    it('differ result carries severity as the aggregate maximum', () => {
      // text difference → 'content' severity (highest)
      const result = diff('<p>hello</p>', '<p>world</p>');
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      expect(result.severity).toBe('content');
    });

    it('returns status: "differ" with non-empty changes when extra element present in the right input', () => {
      // This mirrors the known MDXish <p> wrapper divergence (HTMLBlock safeMode)
      const leftHtml = '<pre class="html-unsafe"><code>text</code></pre>';
      const rightHtml = '<p><pre class="html-unsafe"><code>text</code></pre></p>';
      const result = diff(leftHtml, rightHtml);
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('fast-path', () => {
    it('noHashFastPath: true still produces the correct result via the full walk', () => {
      const html = '<div><p>same</p></div>';
      const result = diff(html, html, { noHashFastPath: true });
      // Full walk should also find no differences
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('noHashFastPath: true on differing inputs still detects the difference', () => {
      const result = diff('<p>hello</p>', '<p>world</p>', { noHashFastPath: true });
      expect(result.status).toBe('differ');
    });
  });

  describe('determinism', () => {
    it('repeated calls with the same inputs return deeply equal results', () => {
      const leftHtml = '<div><h1>Title</h1><p>Content</p><ul><li>A</li><li>B</li></ul></div>';
      const rightHtml =
        '<div><h1>Title</h1><p>Content changed</p><ul><li>A</li><li>B</li><li>C</li></ul></div>';

      const result1 = diff(leftHtml, rightHtml);
      const result2 = diff(leftHtml, rightHtml);
      const result3 = diff(leftHtml, rightHtml);

      expect(result1).toStrictEqual(result2);
      expect(result2).toStrictEqual(result3);
    });

    it('changes[] is in document position order', () => {
      // Two separate differences — the one that appears first in the document
      // should come first in changes[].
      const leftHtml = '<div><p>first</p><p>second</p></div>';
      const rightHtml = '<div><p>FIRST</p><p>SECOND</p></div>';
      const result = diff(leftHtml, rightHtml);
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');

      // Both text nodes should appear as changes in order
      expect(result.changes.length).toBeGreaterThanOrEqual(2);
      const textChanges = result.changes.filter(c => c.kind === 'text');
      expect(textChanges[0].left).toBe('first');
      expect(textChanges[1].left).toBe('second');
    });

    it('changes[] order is stable across multiple runs', () => {
      const leftHtml = '<div><p>a</p><p>b</p><p>c</p></div>';
      const rightHtml = '<div><p>A</p><p>B</p><p>C</p></div>';

      const r1 = diff(leftHtml, rightHtml);
      const r2 = diff(leftHtml, rightHtml);

      expect(r1).toStrictEqual(r2);
      // toStrictEqual already deep-compares changes[] in order — no extra path
      // assertion needed.
    });
  });

  describe('canonicalization edge cases', () => {
    it('drops aria-hidden="false" attrs', () => {
      const a = '<span aria-hidden="false">x</span>';
      const b = '<span>x</span>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('strips heading id counter suffixes by default', () => {
      const a = '<h2 id="introduction-1">intro</h2>';
      const b = '<h2 id="introduction-2">intro</h2>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('preserves heading id counter suffixes when preserveHeadingCounters: true', () => {
      const a = '<h2 id="introduction-1">intro</h2>';
      const b = '<h2 id="introduction-2">intro</h2>';
      const result = diff(a, b, { preserveHeadingCounters: true });
      expect(result.status).toBe('differ');
    });

    it('respects attrIgnore option', () => {
      const a = '<div custom-attr="foo">text</div>';
      const b = '<div custom-attr="bar">text</div>';
      // Without attrIgnore — should differ
      const r1 = diff(a, b);
      expect(r1.status).toBe('differ');
      // With attrIgnore — should match
      const r2 = diff(a, b, { attrIgnore: new Set(['custom-attr']) });
      expect(r2).toStrictEqual({ status: 'match' });
    });
  });

  describe('preset option', () => {
    it('omitting preset is equivalent to cross-engine: same inputs produce identical results', () => {
      // diff(a, b) === diff(a, b, { preset: 'cross-engine' })
      const a = '<p>text <span>more</span> here</p>';
      const b = '<p>text more here</p>';
      const defaultResult = diff(a, b);
      const crossEngineResult = diff(a, b, { preset: 'cross-engine' });
      expect(defaultResult).toStrictEqual(crossEngineResult);
    });

    it('cross-engine preset: bare span-flatten fires and reports match', () => {
      const a = '<p>text <span>more</span> here</p>';
      const b = '<p>text more here</p>';
      const result = diff(a, b, { preset: 'cross-engine' });
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('minimal preset: bare <span> is preserved as a real structural change', () => {
      // span-flatten is skipped under minimal; the <span> is a real diff
      const a = '<p>text <span>more</span> here</p>';
      const b = '<p>text more here</p>';
      const result = diff(a, b, { preset: 'minimal' });
      expect(result.status).toBe('differ');
    });

    it('cross-engine preset: comment-split fragments with surrounding whitespace merge to the spaced text', () => {
      // The space lives on the "foo " fragment; the dropped comment leaves
      // "foo " + "bar" which merges verbatim to "foo bar" → match.
      const a = '<p>foo <!---->bar</p>';
      const b = '<p>foo bar</p>';
      const result = diff(a, b, { preset: 'cross-engine' });
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('cross-engine preset: comment-split fragments with NO surrounding whitespace stay joined (no fabricated space)', () => {
      // Regression: a previous version inserted a space when merging adjacent
      // text, so "foobar" (foo<!---->bar) falsely matched "foo bar". The merge
      // is now verbatim, so the two differ in rendered text.
      const joined = '<p>foo<!---->bar</p>'; // renders "foobar"
      const spaced = '<p>foo bar</p>'; // renders "foo bar"
      const result = diff(joined, spaced, { preset: 'cross-engine' });
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      const textChange = result.changes.find(c => c.kind === 'text');
      expect(textChange?.left).toBe('foobar');
      expect(textChange?.right).toBe('foo bar');

      // ...and the verbatim join genuinely matches the no-space rendering.
      expect(diff(joined, '<p>foobar</p>', { preset: 'cross-engine' })).toStrictEqual({
        status: 'match',
      });
    });

    it('minimal preset: adjacent text nodes from dropped comment stay separate', () => {
      // comment is still dropped, but adjacent-text-merge is skipped → differ
      const a = '<p>foo<!---->bar</p>';
      const b = '<p>foo bar</p>';
      const result = diff(a, b, { preset: 'minimal' });
      expect(result.status).toBe('differ');
    });

    it('minimal preset: always-on transforms still apply (whitespace, class sort, noise attrs, heading strip)', () => {
      const noisy = '<div data-reactroot="" class="beta alpha"><h2 id="intro-2">  heading  </h2></div>';
      const clean = '<div class="alpha beta"><h2 id="intro">heading</h2></div>';
      const result = diff(noisy, clean, { preset: 'minimal' });
      expect(result).toStrictEqual({ status: 'match' });
    });
  });

  describe('significant boundary whitespace', () => {
    it('detects a dropped space between text and an inline element', () => {
      // Renders "hello world" vs "helloworld" — a real content change that
      // per-text-node trimming previously masked.
      const withSpace = '<p>hello <strong>world</strong></p>';
      const noSpace = '<p>hello<strong>world</strong></p>';
      const result = diff(withSpace, noSpace);
      expect(result.status).toBe('differ');
      if (result.status !== 'differ') throw new Error('unreachable');
      expect(result.changes.some(c => c.kind === 'text')).toBe(true);
    });

    it('detects a dropped space between two adjacent inline elements (after span-flatten)', () => {
      // Renders "a b" vs "ab".
      const withSpace = '<span>a</span> <span>b</span>';
      const noSpace = '<span>a</span><span>b</span>';
      const result = diff(withSpace, noSpace);
      expect(result.status).toBe('differ');
    });

    it('still trims insignificant whitespace at block content edges (no false positive)', () => {
      // Leading/trailing whitespace inside a block collapses in rendering, so
      // these are equivalent.
      const a = '<p>  hello <strong>world</strong>  </p>';
      const b = '<p>hello <strong>world</strong></p>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('does not flag identical inline-boundary whitespace (no false positive)', () => {
      const html = '<p>hello <strong>world</strong> again</p>';
      const result = diff(html, html);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('keeps a real inline-boundary space that the other input lacks (preservation guard)', () => {
      // Distinct inputs, not a self-diff: the space between two inline links is
      // significant ("x y" vs "xy"), so it must surface.
      const result = diff('<p><a>x</a> <a>y</a></p>', '<p><a>x</a><a>y</a></p>');
      expect(result.status).toBe('differ');
    });

    it('trims insignificant whitespace inside an inline element at a block edge (no false positive)', () => {
      // Trailing/leading whitespace inside <strong> at the start/end of a block
      // collapses in rendering, so reaching through the inline wrapper must trim
      // it — both render "hello".
      expect(diff('<p><strong>hello </strong></p>', '<p><strong>hello</strong></p>')).toStrictEqual({
        status: 'match',
      });
      expect(diff('<p><strong> hello</strong></p>', '<p><strong>hello</strong></p>')).toStrictEqual({
        status: 'match',
      });
    });

    it('still flags an inline element edge space that is mid-block (significant)', () => {
      // The trailing space inside <strong> here sits between "a" and "b" → "a b"
      // vs "ab", a real difference that must NOT be trimmed away.
      const result = diff('<p>x<strong>a </strong>b</p>', '<p>x<strong>a</strong>b</p>');
      expect(result.status).toBe('differ');
    });
  });

  describe('tag name case-insensitivity', () => {
    it('treats case-only tag-name differences as equal (xmlMode preserves source case)', () => {
      const result = diff('<DIV><P>x</P></DIV>', '<div><p>x</p></div>');
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('classifies an uppercase inline tag as inline (keeps significant boundary space)', () => {
      // Renders "hello world" vs "helloworld"; <STRONG> must be recognized as
      // inline so the boundary space is preserved and the difference surfaces.
      const result = diff('<P>hello <STRONG>world</STRONG></P>', '<P>hello<STRONG>world</STRONG></P>');
      expect(result.status).toBe('differ');
    });

    it('strips heading id counters regardless of tag-name case', () => {
      const a = '<H2 id="intro-1">t</H2>';
      const b = '<h2 id="intro-2">t</h2>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });
  });

  describe('attribute name case-insensitivity', () => {
    it('drops uppercase noise attrs (xmlMode preserves source case)', () => {
      const a = '<div DATA-TESTID="x"><p>t</p></div>';
      const b = '<div><p>t</p></div>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('normalizes (sorts) class regardless of attribute-name case', () => {
      const a = '<div CLASS="beta alpha">t</div>';
      const b = '<div class="alpha beta">t</div>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('matches attrIgnore entries against the lowercased attribute name', () => {
      const a = '<div Custom-Attr="foo">t</div>';
      const b = '<div>t</div>';
      // User supplies the lowercased name, HTML carries mixed case.
      const result = diff(a, b, { attrIgnore: new Set(['custom-attr']) });
      expect(result).toStrictEqual({ status: 'match' });
    });

    it('treats case-only attribute-name differences as equal', () => {
      const a = '<div DATA-FOO="x">t</div>';
      const b = '<div data-foo="x">t</div>';
      const result = diff(a, b);
      expect(result).toStrictEqual({ status: 'match' });
    });
  });
});
