/**
 * Public barrel for `@readme/markdown/render-fixture`.
 *
 * Pairs with the engine-free `@readme/markdown/render-diff` subpath: this
 * bundle DOES include the engine (it has to — its job is to render). A
 * typical consumer that wants regression coverage across @readme/markdown
 * version bumps pairs the two:
 *
 *   import { renderFixture } from '@readme/markdown/render-fixture';
 *   import { diff } from '@readme/markdown/render-diff';
 *
 *   const oldHtml = readFileSync('snapshot.html', 'utf8');
 *   const { html: newHtml } = renderFixture(body, ctx, 'mdxish');
 *   const result = diff(oldHtml, newHtml, { preset: 'minimal' });
 */
export { loadFixture } from './loadFixture';
export type { RenderContext } from './loadFixture';
export { renderFixture } from './renderFixture';
export type { Engine, FixtureRenderResult } from './renderFixture';
