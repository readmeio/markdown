import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { removePosition } from 'unist-util-remove-position';

import { mix } from '../../../../lib';
import normalizeEmphasisAST from '../../../../processor/transform/mdxish/normalize-malformed-md-syntax';

const processor = remark().use(remarkParse).use(normalizeEmphasisAST);

describe('pathological input performance', () => {
  // A pasted base64 attachment body: one huge single-line token. Every
  // character position used to trigger an unbounded prefix scan in the
  // loose-emphasis regexes, making the pass O(n²) — a 520KB forum post pegged
  // production SSR for ~30 minutes per render (developer.corrigo.com/discuss
  // Cloudflare 524 incident, 2026-08-13; reported in #support, no ticket).
  const BASE64_UNIT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  // The base64url alphabet swaps `+/` for `-_`: its underscores hit the
  // underscore regex families, whose content clauses can scan across `_`
  // (unlike `[^*\n]`, which stops at `*`) — so these blobs exercise the
  // whitespace-adjacency gate and the bounded content quantifiers.
  const BASE64URL_UNIT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  // Times only the transform (parse is not under test); best-of-N cancels
  // JIT/GC noise, matching __tests__/lib/mdxish/perf/html-block-perf.test.ts.
  function fastestNormalize(md: string, runs = 3): number {
    let best = Infinity;
    for (let i = 0; i < runs; i += 1) {
      const tree = processor.parse(md);
      const start = performance.now();
      processor.runSync(tree);
      best = Math.min(best, performance.now() - start);
    }
    return best;
  }

  // Assert scaling, not a wall-clock budget: comparing the two timings cancels
  // machine speed, so this is stable across dev/CI. 4× the input should take
  // ~4× the time (the old unbounded-prefix scan hit ~16×, with tBig around
  // 6,000ms). The absolute 50ms escape hatch exists for runs too fast to
  // measure a meaningful ratio — the marker-free case early-exits in
  // microseconds, where dividing two timer-resolution readings is pure noise.
  // A pass that finishes 32KB in under 50ms is not a regression worth failing.
  // Each builder takes a size factor n (the small run uses 125, the big run
  // 500) and returns a ~64n-char pathological body.
  it.each([
    ['a large marker-free token', (n: number) => `Hi team,\n\nHere is the payload:\n\n${BASE64_UNIT.repeat(n)}`],
    // A lone marker character in the same paragraph means marker-presence
    // gating can't skip the node: the scan itself must be bounded.
    ['a large unbroken token sharing a text node with a marker', (n: number) => `The value* is ${BASE64_UNIT.repeat(n)}`],
    // base64url underscores are never beside whitespace, so the loose
    // whitespace-adjacency gate must skip the underscore families entirely.
    ['a large base64url token', (n: number) => `Hi team,\n\nHere is the payload:\n\n${BASE64URL_UNIT.repeat(n)}`],
    // A loose `_ ` in the same text node defeats the gate: every `_` inside
    // the blob starts a content scan, which must be bounded to stay linear.
    [
      'a large base64url token sharing a text node with a loose underscore',
      (n: number) => `The value_ is ${BASE64URL_UNIT.repeat(n)}`,
    ],
    // Marker-dense short words instead of one unbroken token: each marker is
    // intraword (never beside whitespace), so the gate must skip these too.
    ['a marker-dense intraword-underscore paragraph', (n: number) => 'a_b '.repeat(16 * n)],
    ['a marker-dense intraword-asterisk paragraph', (n: number) => 'a*b '.repeat(16 * n)],
  ])(
    'processes %s in linear time',
    (_label, buildMd) => {
      // Sizes are deliberately modest: vitest cannot preempt synchronous code,
      // so a reintroduced O(n²) scan must fail the ratio in seconds, not wedge
      // the suite for minutes.
      const tSmall = fastestNormalize(buildMd(125));
      const tBig = fastestNormalize(buildMd(500));

      expect(tBig).toBeLessThan(Math.max(10 * tSmall, 50));
    },
    30_000,
  );

  // Every bounded regex family, since each has its own lookaheads and content
  // clauses: the bound must not change normalization output for any of them.
  const boundedFamilies = [
    { marker: '**', type: 'strong' },
    { marker: '__', type: 'strong' },
    { marker: '*', type: 'emphasis' },
    { marker: '_', type: 'emphasis' },
  ] as const;

  // Bounding the wordBefore scan must not change normalization output, even
  // for words longer than the scan bound.
  it.each(boundedFamilies)(
    'still normalizes $marker emphasis preceded by a word longer than the prefix scan bound',
    ({ marker, type }) => {
      const longWord = 'x'.repeat(80);
      const md = `${longWord}${marker} Wrong Bold${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: `${longWord} ` },
          { type, children: [{ type: 'text', value: 'Wrong Bold' }] },
        ],
      });
    },
  );

  // Bounding the whitespace scan must not change output either: extra spaces
  // beyond the bound are preserved as leading text.
  it.each(boundedFamilies)('still normalizes $marker emphasis preceded by a long run of spaces', ({ marker, type }) => {
    const spaces = ' '.repeat(20);
    const md = `Hello\n\nA${spaces}${marker} World${marker}`;
    const tree = processor.parse(md);
    processor.runSync(tree);
    removePosition(tree, { force: true });

    expect(tree.children[1]).toStrictEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: `A${spaces}` },
        { type, children: [{ type: 'text', value: 'World' }] },
      ],
    });
  });

  // The same bounded inputs through the full mdxish engine, which is the only
  // pipeline that runs this transform (see lib/mdxish.ts) — RMDX compiles
  // emphasis natively and never executes it. This catches wiring regressions
  // the direct-transformer tests above can't.
  describe('mdxish engine integration', () => {
    const tagFor = { strong: 'strong', emphasis: 'em' } as const;

    it.each(boundedFamilies)(
      'renders $marker emphasis preceded by a word longer than the prefix scan bound',
      ({ marker, type }) => {
        const tag = tagFor[type];
        const longWord = 'x'.repeat(80);

        expect(mix(`${longWord}${marker} Wrong Bold${marker}`)).toBe(`<p>${longWord} <${tag}>Wrong Bold</${tag}></p>`);
      },
    );

    // Only the marker-free alphabet renders verbatim: in a base64url blob,
    // CommonMark itself emphasizes `_…_` spans whose underscores sit beside
    // `-` (punctuation makes them flanking) — native parsing, not this pass.
    it('renders a paragraph containing a huge marker-free token verbatim', () => {
      const blob = BASE64_UNIT.repeat(125);

      expect(mix(`The payload is ${blob}`)).toBe(`<p>The payload is ${blob}</p>`);
    });
  });
});
