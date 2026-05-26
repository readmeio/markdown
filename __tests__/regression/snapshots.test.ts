import type { Engine } from '../../lib/render-fixture';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { loadFixture, renderFixture } from '../../lib/render-fixture';


const FIXTURES_DIR = join(__dirname, 'fixtures');

describe('Suite A: per-engine', () => {
  const fixtures = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  const cases: [fixture: string, engine: Engine][] = fixtures.flatMap(fixture =>
    (['mdx', 'mdxish'] as const).map(engine => [fixture, engine] as [string, Engine]),
  );

  it.each(cases)('%s (%s)', (fixture, engine) => {
    const { body, ctx } = loadFixture(join(FIXTURES_DIR, fixture));
    const { html } = renderFixture(body, ctx, engine);
    expect(html).toMatchSnapshot();
  });
});
