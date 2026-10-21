/* eslint-disable no-console -- CLI script: console output is the deliberate UX */
/* eslint-disable import/no-extraneous-dependencies -- build-time script */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { minify } = require('terser');

// gemoji's catalog is the only source of its category names, so finding one means the catalog shipped.
const CATALOG_MARKER = 'Smileys & Emotion';
const distPath = file => path.join(__dirname, '..', 'dist', file);

// Webpack leaves an unused catalog in as dead code, so check what a minifier actually keeps.
const shipsCatalog = async bundlePath => {
  const { code } = await minify(fs.readFileSync(bundlePath, 'utf-8'), { mangle: false });
  return code.includes(CATALOG_MARKER);
};

async function verifyOwlmoji() {
  const bundlePath = process.env.VERIFY_OWLMOJI_BUNDLE_PATH || distPath('main.js');
  assert(
    !(await shipsCatalog(bundlePath)),
    `bundling violation: gemoji's catalog survives minification of ${bundlePath} — only lib/owlmoji-details may use it`,
  );
  console.log(`main bundle guard: PASS — ${bundlePath} minifies without gemoji's catalog`);

  assert(await shipsCatalog(distPath('owlmoji-details.js')), 'dist/owlmoji-details.js is missing the catalog');
  console.log('browser entry: PASS — dist/owlmoji-details.js ships the catalog');

  // Self-referencing probe: resolves through the package.json exports map.
  const { owlmojiDetails } = require('@readme/markdown/owlmoji-details'); // eslint-disable-line global-require
  assert(
    owlmojiDetails.some(({ names }) => names.includes('smile')) &&
      owlmojiDetails.some(({ names }) => names.includes('owlbert')),
    'owlmoji details are missing gemoji or owlmoji entries',
  );
  console.log('self-ref probe: PASS — @readme/markdown/owlmoji-details resolves with the full catalog');
}

verifyOwlmoji().catch(error => {
  console.error(error);
  process.exit(1);
});
