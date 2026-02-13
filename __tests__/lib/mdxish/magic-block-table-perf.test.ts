/**
 * Performance benchmark for magic block table parsing.
 *
 * Validates that large tables with complex cell content
 * (markdown, HTML, variables) parse within reasonable time.
 */
import { mdxish } from '../../../lib';

function buildTableBlock(
  rows: number,
  cols: number,
  cellContent: (r: number, c: number) => string = (r, c) => `Cell ${r}-${c}`,
) {
  const data: Record<string, string> = {};
  for (let c = 0; c < cols; c += 1) {
    data[`h-${c}`] = `Header ${c}`;
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      data[`${r}-${c}`] = cellContent(r, c);
    }
  }
  return `[block:parameters]\n${JSON.stringify({ data, cols, rows })}\n[/block]`;
}

function bench(fn: () => void, iterations = 5): { avg: number; max: number; min: number } {
  // warm up
  fn();

  const times: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);
  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: times[0],
    max: times[times.length - 1],
  };
}

describe('magic block table performance', () => {
  const scenarios = [
    {
      name: '5x3 plain text (15 cells)',
      md: buildTableBlock(5, 3),
    },
    {
      name: '20x5 plain text (100 cells)',
      md: buildTableBlock(20, 5),
    },
    {
      name: '50x10 plain text (500 cells)',
      md: buildTableBlock(50, 10, (r, c) => `Row ${r} col ${c} with some text`),
    },
    {
      name: '50x10 markdown (500 cells)',
      md: buildTableBlock(50, 10, (r, c) => `**bold** _italic_ \`code\` [link](https://example.com/${r}/${c})`),
    },
    {
      name: '50x10 HTML in cells (500 cells)',
      md: buildTableBlock(50, 10, (r, c) => `<code>value-${r}-${c}</code> and <em>emphasis</em>`),
    },
    {
      name: '50x10 with variables (500 cells)',
      md: buildTableBlock(50, 10, (r, c) => `User: {user.name} (field ${r}-${c})`),
    },
    {
      name: '100x10 markdown (1000 cells)',
      md: buildTableBlock(100, 10, (r, c) => `**bold ${r}** and [link](https://example.com/${c})`),
    },
  ];

  it.each(scenarios)('parses $name within 10s', ({ md }) => {
    const stats = bench(() => mdxish(md));

    // eslint-disable-next-line no-console
    console.log(`  avg=${stats.avg.toFixed(1)}ms  min=${stats.min.toFixed(1)}ms  max=${stats.max.toFixed(1)}ms`);

    expect(stats.avg).toBeLessThan(10000);
  });
});
