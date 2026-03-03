import { describe, it, expect } from 'vitest';

import { mdxish } from '../../../lib';

/**
 * Regression tests for stack overflow when parsing HTML blocks
 *
 * We've had a case where an autolink (e.g. https://www.example.com) wrapped in HTML tags,
 * inside a magic block table cell, was causing a stack overflow.
 * The overflow was caused by 3 nested synchronous parser invocations
 * (contentParser → htmlParser → markdownToHtml) whose combined call stack
 * depth exceeded browser limits (~10K frames).
 *
 * This test ensures that we don't regress and that we can parse table cells
 * safely without causing a stack overflow.
 *
 * Add more tests as we find more cases where we're causing a stack overflow
 */
describe('magic block stack overflow', () => {
  // Consume stack frames to approximate browser stack limits (~10K frames).
  function consumeStack(depth: number, fn: () => void) {
    if (depth <= 0) return fn();
    return consumeStack(depth - 1, fn);
  }

  const makeInput = (cellContent: string) => `[block:parameters]
{
  "data": {
    "h-0": "Method",
    "0-0": ${JSON.stringify(cellContent)}
  },
  "cols": 1,
  "rows": 1,
  "align": ["left"]
}
[/block]`;

  it('should not overflow with https URL inside HTML', () => {
    consumeStack(4000, () => {
      expect(() => mdxish(makeInput('<ul><li>https://a</li>\n</ul>'))).not.toThrow();
    });
  });

  it('should not overflow with http URL inside HTML', () => {
    consumeStack(4000, () => {
      expect(() => mdxish(makeInput('<ul><li>http://example.com/path</li>\n</ul>'))).not.toThrow();
    });
  });

  it('should still process markdown syntax inside HTML', () => {
    const result = mdxish(makeInput('<ul><li>_emphasis_</li>\n</ul>'));
    const hast = JSON.stringify(result);
    expect(hast).toContain('"tagName":"em"');
  });
});
