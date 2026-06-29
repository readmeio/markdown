/**
 * Source-level direct forbidden-import guard for lib/render-diff/.
 *
 * SCOPE: DIRECT imports only — not a transitive proof.
 *
 * This test regex-scans every .ts file under lib/render-diff/ for direct
 * import statements that would couple the render-diff module to engine code
 * (lib/compile, lib/mdxish, lib/renderMdxish, lib/run, lib/exports, or
 * processor/*).
 *
 * Intentional limitation: a transitive chain such as
 *   lib/render-diff/foo.ts → ../shared-helper.ts → ../compile.ts
 * would not be caught here because the regex only inspects files under
 * lib/render-diff/ directly.
 *
 * Transitive leaks are defended at the bundle layer by two complementary
 * mechanisms:
 *   - scripts/verify-render-diff.cjs scans dist/render-diff.node.js for
 *     engine identifiers regardless of how they entered the bundle.
 *   - the bundlewatch budget catches the ~10x size regression that any
 *     engine inclusion would produce.
 */
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

// ------------------------------------------------------------------ constants

const RENDER_DIFF_DIR = path.join(__dirname, '..', '..', '..', 'lib', 'render-diff');

/**
 * Forbidden direct import patterns.
 *
 * Each regex matches a TypeScript import statement whose module specifier
 * resolves to one of the five engine modules (or the processor/ directory).
 * Patterns use single-quote OR double-quote to be robust to code style.
 *
 * Note: patterns are intentionally anchored to the relative import prefix
 * `../` so they only match direct engine imports, not substrings inside
 * identifiers or comments.
 */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /from ['"]\.\.\/compile['"]/,
  /from ['"]\.\.\/mdxish['"]/,
  /from ['"]\.\.\/renderMdxish['"]/,
  /from ['"]\.\.\/run['"]/,
  /from ['"]\.\.\/exports['"]/,
  /from ['"]\.\.\/\.\.\/processor\//,
];

// ------------------------------------------------------------------ helpers

function collectTsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter(name => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map(name => path.join(dir, name));
}

// ------------------------------------------------------------------ tests

describe('lib/render-diff — direct forbidden import guard', () => {
  const files = collectTsFiles(RENDER_DIFF_DIR);
  const repoRoot = path.join(__dirname, '..', '..', '..');

  it('finds TypeScript source files under lib/render-diff/', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map(filePath => [filePath.replace(`${repoRoot}/`, ''), filePath]))(
    '%s contains no direct engine imports',
    (_relativePath, filePath) => {
      const source = readFileSync(filePath, 'utf-8');

      FORBIDDEN_PATTERNS.forEach(pattern => {
        expect(source).not.toMatch(pattern);
      });
    },
  );
});
