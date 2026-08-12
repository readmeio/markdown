/**
 * Performance regression tests for large multi-line `<HTMLBlock>` content.
 *
 * A migrated `[block:html]` becomes `<HTMLBlock>{`…tens of thousands of lines…`}`,
 * with every line hitting micromark's flow pipeline. These guard the parse against
 * a per-line O(n²) blow-up via scaling (machine-independent, unlike a wall-clock
 * budget) and verify the payload survives verbatim.
 *
 * mdxish only: `<HTMLBlock>` is parsed by the mdxish html-block tokenizer; RMDX
 * compiles it as generic MDX JSX (a different path), so there's no equivalent
 * html-block node or regression to assert there.
 */
import { mdxish } from '../../../../lib';
import { findAllElementsByTagName } from '../../../helpers';

/**
 * A top-level `<HTMLBlock>` whose body is `lines` physical lines of inline SVG.
 * Each line's path is unique (`M0 <i>h16z`) so an exact payload comparison also
 * catches reordering, truncation, or dropped/duplicated lines — not just a count.
 */
function buildHtmlBlock(lines: number): { md: string; expectedHtml: string } {
  const rows = Array.from(
    { length: lines },
    (_, i) => `  <svg viewBox="0 0 16 16"><path d="M0 ${i}h16z"></path></svg>`,
  ).join('\n');
  const expectedHtml = `<div class="grid">\n${rows}\n</div>`;
  const md = `# Doc\n\n<HTMLBlock>{\`\n${expectedHtml}\n\`}</HTMLBlock>\n`;
  return { md, expectedHtml };
}

const htmlBlockPayloads = (tree: ReturnType<typeof mdxish>) =>
  findAllElementsByTagName(tree, 'html-block').map(n => String(n.properties?.html ?? ''));

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

describe('large <HTMLBlock> performance', () => {
  it.each([1_000, 10_000, 30_000, 57_000])('preserves the payload of a %d-line block verbatim', lines => {
    const { md, expectedHtml } = buildHtmlBlock(lines);
    // Full payload equality — verifies content, ordering, and completeness.
    expect(htmlBlockPayloads(mdxish(md))).toStrictEqual([expectedHtml]);
  }, 30_000);

  it('parses in roughly linear time, not O(n²)', () => {
    // Assert the scaling ratio, not a wall-clock budget: dividing the timings
    // cancels machine speed, so this is stable across dev/CI. N× the lines should
    // take ~N× the time; a per-line O(n²) regression pushes the ratio toward N².
    const t10 = fastestParse(buildHtmlBlock(10_000).md);
    const t30 = fastestParse(buildHtmlBlock(30_000).md);
    const t57 = fastestParse(buildHtmlBlock(57_000).md);
    const ratio30 = t30 / t10;
    const ratio57 = t57 / t10;
    // eslint-disable-next-line no-console
    console.log(`  30k/10k = ${ratio30.toFixed(2)}× (linear ≈ 3, quadratic ≈ 9) | 57k/10k = ${ratio57.toFixed(2)}× (linear ≈ 5.7, quadratic ≈ 32)`);

    expect(ratio30).toBeLessThan(5);
    expect(ratio57).toBeLessThan(10);
  }, 30_000);
});
