/* eslint-disable no-console -- CLI script: console output is the deliberate UX */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// --- Dist-grep block: engine-identifier scan ---
// Verifies that dist/render-diff.node.js (or the path given by
// VERIFY_RENDER_DIFF_BUNDLE_PATH) contains none of the five engine identifiers
// that would indicate engine code leaked into the render-diff bundle.
//
// The bundle path is overridable via VERIFY_RENDER_DIFF_BUNDLE_PATH so that
// negative smoke tests can run against a /tmp copy without ever mutating dist/.
//
// ENGINE_TOKENS are verified to appear in dist/main.node.js (positive control)
// and absent from lib/render-diff/**/*.ts (negative control). DO NOT substitute
// generic substrings ('compile', 'mdxish', 'htmlparser2') — those produce
// false positives.
const bundlePath = process.env.VERIFY_RENDER_DIFF_BUNDLE_PATH || path.join(__dirname, '..', 'dist', 'render-diff.node.js');
const bundle = fs.readFileSync(bundlePath, 'utf-8');

const ENGINE_TOKENS = [
  'mdxishAstProcessor',
  'mdxishMdastToMd',
  'renderMdxish',
  'mdxCompileSync',
  'sanitizeSchema',
];

ENGINE_TOKENS.forEach(token => {
  assert(
    !bundle.includes(token),
    `engine-leak violation: identifier '${token}' found in ${bundlePath} — engine code leaked into render-diff bundle`,
  );
});
console.log(`dist grep: PASS — no engine identifiers found in ${bundlePath}`);

// --- Self-referencing probe: exports map resolution ---
// Node 22 self-referencing: a .cjs file inside the @readme/markdown package
// can require('@readme/markdown/render-diff') and Node uses the exports map.
// Requires package.json to have an "exports" field — fails with MODULE_NOT_FOUND if absent.
//
// NOTE: this path is intentionally NOT overridable — the purpose of this probe
// is to validate that the real exports map resolves the subpath correctly.
// Making it path-overridable would defeat the resolution check.
const { diff } = require('@readme/markdown/render-diff');

assert(typeof diff === 'function', 'diff is not a function after exports map resolution');

const result = diff('<p>hello</p>', '<p>hello</p>');
assert(result.status === 'match', `Expected status 'match', got '${result.status}'`);
console.log('self-ref probe: PASS — @readme/markdown/render-diff resolves and diff() works');

console.log('\nverify-render-diff: ALL CHECKS PASSED');
