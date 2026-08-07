/**
 * Performance regression tests for large multi-line `<HTMLBlock>` content.
 *
 * Validates that a block with tens of thousands of physical lines parses within
 * reasonable time (guarding against a per-line O(n²) blow-up).
 *
 * mdxish only: `<HTMLBlock>` is parsed by the mdxish html-block tokenizer; RMDX
 * compiles it as generic MDX JSX (a different path), so there's no equivalent
 * html-block node or regression to assert there.
 */
import { mdxish } from '../../../lib';
import { findAllElementsByTagName } from '../../helpers';

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

/** Per-iteration parse times (warm-up run excluded). */
function bench(fn: () => void, iterations = 2): number[] {
  fn(); // warm up
  const times: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return times;
}

const htmlBlockPayloads = (tree: ReturnType<typeof mdxish>) =>
  findAllElementsByTagName(tree, 'html-block').map(n => String(n.properties?.html ?? ''));

describe('large <HTMLBlock> performance', () => {
  const scenarios = [
    { name: '1k lines', lines: 1_000 },
    { name: '10k lines', lines: 10_000 },
    { name: '30k lines', lines: 30_000 },
  ];

  it.each(scenarios)('renders a $name HTMLBlock within 10s and intact', ({ lines }) => {
    const { md, expectedHtml } = buildHtmlBlock(lines);
    let tree!: ReturnType<typeof mdxish>;
    const samples = bench(() => {
      tree = mdxish(md);
    });
    // eslint-disable-next-line no-console
    console.log(`  ${lines} lines: ${samples.map(s => s.toFixed(0)).join('/')}ms`);

    // Full payload equality — verifies content, ordering, and completeness.
    expect(htmlBlockPayloads(tree)).toStrictEqual([expectedHtml]);
    samples.forEach(sample => expect(sample).toBeLessThan(10_000));
  }, 30_000); // generous wall-clock so CPU contention under the full suite can't false-timeout

  it('renders a customer-scale ~57k-line HTMLBlock within 10s and intact', () => {
    const { md, expectedHtml } = buildHtmlBlock(57_000);
    const start = performance.now();
    const tree = mdxish(md);
    const elapsed = performance.now() - start;
    // eslint-disable-next-line no-console
    console.log(`  57k lines: ${elapsed.toFixed(0)}ms`);

    expect(htmlBlockPayloads(tree)).toStrictEqual([expectedHtml]);
    expect(elapsed).toBeLessThan(10_000);
  }, 30_000);
});
