/* eslint-disable no-console -- CLI script: console output is the deliberate UX */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// --- Positive control: engine identifiers MUST be present ---
// render-fixture exists to render markdown through the engine; if the
// bundle doesn't contain engine code, the subpath is broken. This is the
// inverse of render-diff's check (which requires the same tokens to be
// absent).
const bundlePath =
  process.env.VERIFY_RENDER_FIXTURE_BUNDLE_PATH ||
  path.join(__dirname, '..', 'dist', 'render-fixture.node.js');
const bundle = fs.readFileSync(bundlePath, 'utf-8');

const ENGINE_TOKENS = [
  'mdxishAstProcessor',
  'mdxishMdastToMd',
  'renderMdxish',
  'mdxCompileSync',
  'sanitizeSchema',
];

const missing = ENGINE_TOKENS.filter(token => !bundle.includes(token));
assert(
  missing.length === 0,
  `render-fixture bundle is missing required engine identifiers: ${missing.join(', ')} — the renderer will not work at runtime`,
);
console.log(`engine-presence: PASS — all ${ENGINE_TOKENS.length} engine identifiers present in ${bundlePath}`);

// --- Self-referencing probe: exports map resolution + smoke render ---
// Same pattern as verify-render-diff.cjs but for the render-fixture subpath.
// NOT path-overridable — this validates the real exports map.
const { renderFixture, loadFixture } = require('@readme/markdown/render-fixture');

assert(typeof renderFixture === 'function', 'renderFixture is not a function after exports map resolution');
assert(typeof loadFixture === 'function', 'loadFixture is not a function after exports map resolution');

// Smoke render: plain markdown through both engines, assert non-empty HTML.
const body = '# Hello\n\nSmoke test.';
const ctx = { variables: { defaults: [], user: {} }, glossary: [], components: [] };

const mdxResult = renderFixture(body, ctx, 'mdx');
assert(mdxResult.error === null, `MDX render failed: ${mdxResult.error}`);
assert(mdxResult.html.includes('Hello'), 'MDX render did not contain heading text');

const mdxishResult = renderFixture(body, ctx, 'mdxish');
assert(mdxishResult.error === null, `MDXish render failed: ${mdxishResult.error}`);
assert(mdxishResult.html.includes('Hello'), 'MDXish render did not contain heading text');

console.log('self-ref probe: PASS — @readme/markdown/render-fixture resolves and both engines render');

console.log('\nverify-render-fixture: ALL CHECKS PASSED');
