/**
 * Performance regression tests for large multi-line `<HTMLBlock>` content.
 *
 * Validates that a block with tens of thousands of physical lines parses within
 * reasonable time (guarding against a per-line O(n²) blow-up).
 */
import { mdxish } from '../../../lib';
import { findAllElementsByTagName } from '../../helpers';

/** A top-level `<HTMLBlock>` whose body is `lines` physical lines of inline SVG. */
function buildHtmlBlock(lines: number): string {
  const rows = Array.from(
    { length: lines },
    (_, i) => `  <svg viewBox="0 0 16 16"><path d="M0 ${i % 16}h16z" /></svg>`,
  ).join('\n');
  return `# Doc\n\n<HTMLBlock>{\`\n<div class="grid">\n${rows}\n</div>\n\`}</HTMLBlock>\n`;
}

function bench(fn: () => void, iterations = 2): number {
  fn(); // warm up
  const times: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return times.reduce((a, b) => a + b, 0) / times.length;
}

const svgCount = (tree: ReturnType<typeof mdxish>) => {
  const [html] = findAllElementsByTagName(tree, 'html-block').map(n => String(n.properties?.html ?? ''));
  return (html.match(/<svg/g) || []).length;
};

describe('large <HTMLBlock> performance', () => {
  const scenarios = [
    { name: '1k lines', lines: 1_000 },
    { name: '10k lines', lines: 10_000 },
    { name: '30k lines', lines: 30_000 },
  ];

  it.each(scenarios)('renders a $name HTMLBlock within 10s and intact', ({ lines }) => {
    const md = buildHtmlBlock(lines);
    let tree!: ReturnType<typeof mdxish>;
    const avg = bench(() => {
      tree = mdxish(md);
    });
    // eslint-disable-next-line no-console
    console.log(`  ${lines} lines: avg=${avg.toFixed(0)}ms`);

    expect(svgCount(tree)).toBe(lines); // body preserved verbatim
    expect(avg).toBeLessThan(10_000);
  }, 30_000); // generous wall-clock so CPU contention under the full suite can't false-timeout

  it('renders a customer-scale ~57k-line HTMLBlock within 10s and intact', () => {
    const md = buildHtmlBlock(57_000);
    const start = performance.now();
    const tree = mdxish(md);
    const elapsed = performance.now() - start;
    // eslint-disable-next-line no-console
    console.log(`  57k lines: ${elapsed.toFixed(0)}ms`);

    expect(svgCount(tree)).toBe(57_000);
    expect(elapsed).toBeLessThan(10_000);
  }, 30_000);
});
