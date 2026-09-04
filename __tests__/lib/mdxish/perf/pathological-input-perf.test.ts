/**
 * Performance regression tests for inputs that made mdxish superlinear.
 *
 * 1. Huge attribute values: a `<Card imageSrc="data:image/svg+xml;base64,…">` inlines
 *    tens of KB of base64 in one attribute. `mdx-blocks`' nested-expression check
 *    backtracked quadratically over the unbroken run (the sportradar reference
 *    overview spent 2.5s of its render there).
 * 2. Stray `<` in prose: the mdx-component opener scan and `closeSelfClosingHtmlTags`
 *    both ran on past a raw `<`, rescanning the rest of the line/document per `<`.
 *
 * Assert scaling ratios rather than wall-clock budgets so this stays machine independent.
 */
import { mdxish } from '../../../../lib';
import { findAllElementsByTagName } from '../../../helpers';

/** A `<Cards>` wrapper around one `<Card>` whose data URI is `chars` base64 chars long. */
function buildCards(chars: number): { imageSrc: string, md: string; } {
  const imageSrc = `data:image/svg+xml;base64,${'A'.repeat(chars)}`;
  const md = `<Cards columns={2}>
  <Card title="UFL API" href="https://example.com/ufl" imageSrc="${imageSrc}">
    United Football League
  </Card>
</Cards>
`;
  return { md, imageSrc };
}

/** Fastest of `iterations` parses (warm-up excluded); the min is the most noise-stable sample. */
function fastestParse(md: string, iterations = 4): number {
  mdxish(md); // warm up
  let best = Infinity;
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    mdxish(md);
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

describe('huge data-URI attribute performance', () => {
  it('keeps the attribute verbatim on the promoted component', () => {
    const { md, imageSrc } = buildCards(40_000);
    const [card] = findAllElementsByTagName(mdxish(md), 'Card');
    expect(card.properties?.imageSrc).toBe(imageSrc);
  });

  it('parses in roughly linear time in the attribute length, not O(n²)', () => {
    const t20 = fastestParse(buildCards(20_000).md);
    const t60 = fastestParse(buildCards(60_000).md);
    const t120 = fastestParse(buildCards(120_000).md);
    const ratio60 = t60 / t20;
    const ratio120 = t120 / t20;
    // eslint-disable-next-line no-console
    console.log(`  60k/20k = ${ratio60.toFixed(2)}× (linear ≈ 3, quadratic ≈ 9) | 120k/20k = ${ratio120.toFixed(2)}× (linear ≈ 6, quadratic ≈ 36)`);

    expect(ratio60).toBeLessThan(5);
    expect(ratio120).toBeLessThan(10);
  }, 30_000);
});

describe('stray `<` in prose performance', () => {
  /** A `<div>` body of `count` repetitions of `a <b ` on one line, with no closing `>`. */
  const buildStrayLt = (count: number) => `<div>\n${'a <b '.repeat(count)}\n</div>\n`;

  it('keeps the prose as text', () => {
    const [div] = findAllElementsByTagName(mdxish(buildStrayLt(3)), 'div');
    expect(div.children.some(child => child.type === 'element' && child.tagName === 'b')).toBe(false);
  });

  it('parses in roughly linear time in the number of stray `<`, not O(n²)', () => {
    const t1 = fastestParse(buildStrayLt(1_000));
    const t3 = fastestParse(buildStrayLt(3_000));
    const t6 = fastestParse(buildStrayLt(6_000));
    const ratio3 = t3 / t1;
    const ratio6 = t6 / t1;
    // eslint-disable-next-line no-console
    console.log(`  3k/1k = ${ratio3.toFixed(2)}× (linear ≈ 3, quadratic ≈ 9) | 6k/1k = ${ratio6.toFixed(2)}× (linear ≈ 6, quadratic ≈ 36)`);

    expect(ratio3).toBeLessThan(5);
    expect(ratio6).toBeLessThan(10);
  }, 30_000);
});
