import { describe, it, expect } from 'vitest';

import { renderFixture } from '../../../lib/render-fixture/renderFixture';

describe('renderFixture smoke test', () => {
  const body = '# Hello\n\nSmoke test prose.';
  const ctx = {
    variables: { defaults: [], user: {} },
    glossary: [],
    components: [],
  };

  it('MDX engine returns non-empty HTML containing the heading text', () => {
    const result = renderFixture(body, ctx, 'mdx');
    expect(result.error).toBeNull();
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.html).toContain('Hello');
  });

  it('MDXish engine returns non-empty HTML containing the heading text', () => {
    const result = renderFixture(body, ctx, 'mdxish');
    expect(result.error).toBeNull();
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.html).toContain('Hello');
  });

  it('determinism: MDX engine returns byte-identical HTML on repeated calls', () => {
    const result1 = renderFixture(body, ctx, 'mdx');
    const result2 = renderFixture(body, ctx, 'mdx');
    expect(result1.html).toBe(result2.html);
  });
});
