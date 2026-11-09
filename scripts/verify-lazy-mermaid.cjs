/* eslint-disable no-console -- CLI script: console output is the deliberate UX */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// --- Lazy-mermaid guard: browser bundle must not load mermaid eagerly ---
const bundlePath = process.env.VERIFY_LAZY_MERMAID_BUNDLE_PATH || path.join(__dirname, '..', 'dist', 'main.js');
const bundle = fs.readFileSync(bundlePath, 'utf-8');

assert(
  !bundle.includes('require("mermaid")'),
  `eager-load violation: require("mermaid") found in ${bundlePath} — mermaid is being loaded eagerly via the UMD factory`,
);

assert(
  bundle.includes('import("mermaid")'),
  `missing lazy import: import("mermaid") not found in ${bundlePath} — mermaid is either bundled or externalized eagerly`,
);

assert(
  !bundle.includes('mermaidAPI'),
  `bundling violation: mermaid library code found in ${bundlePath} — the mermaid external is not being applied`,
);

console.log(`lazy-mermaid guard: PASS — ${bundlePath} defers mermaid via import()`);
