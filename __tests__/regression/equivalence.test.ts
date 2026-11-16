import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { diff } from '../../lib/render-diff';
import { loadFixture, renderFixture } from '../../lib/render-fixture';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('MDX↔MDXish equivalence', () => {
  const fixtures = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  it.each(fixtures)('%s', fixtureName => {
    const { body, ctx } = loadFixture(path.join(FIXTURES_DIR, fixtureName));
    const { html: mdxHtml } = renderFixture(body, ctx, 'mdx');
    const { html: mdxishHtml } = renderFixture(body, ctx, 'mdxish');
    const result = diff(mdxHtml, mdxishHtml);
    expect(result).toMatchSnapshot();
  });
});
