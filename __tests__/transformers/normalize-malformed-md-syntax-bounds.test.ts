import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { removePosition } from 'unist-util-remove-position';

import { mix } from '../../lib';
import normalizeEmphasisAST from '../../processor/transform/mdxish/normalize-malformed-md-syntax';

const processor = remark().use(remarkParse).use(normalizeEmphasisAST);

describe('pathological input performance', () => {
  // A pasted base64 attachment body: one huge single-line token. Every
  // character position used to trigger an unbounded prefix scan in the
  // loose-emphasis regexes, making the pass O(n²) — a 520KB forum post pegged
  // production SSR for ~30 minutes per render (developer.corrigo.com/discuss
  // Cloudflare 524 incident, 2026-08-13; reported in #support, no ticket).
  const BASE64_UNIT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

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
  it.each([
    ['a large marker-free token', (blob: string) => `Hi team,\n\nHere is the payload:\n\n${blob}`],
    // A lone marker character in the same paragraph means marker-presence
    // gating can't skip the node: the scan itself must be bounded.
    ['a large unbroken token sharing a text node with a marker', (blob: string) => `The value* is ${blob}`],
  ])(
    'processes %s in linear time',
    (_label, buildMd) => {
      // Sizes are deliberately modest: vitest cannot preempt synchronous code,
      // so a reintroduced O(n²) scan must fail the ratio in seconds, not wedge
      // the suite for minutes.
      const tSmall = fastestNormalize(buildMd(BASE64_UNIT.repeat(125)));
      const tBig = fastestNormalize(buildMd(BASE64_UNIT.repeat(500)));

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

    it('renders a paragraph containing a huge marker-free token verbatim', () => {
      const blob = BASE64_UNIT.repeat(125);

      expect(mix(`The payload is ${blob}`)).toBe(`<p>The payload is ${blob}</p>`);
    });
  });
});
