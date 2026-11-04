import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import * as sass from 'sass';
import { defineConfig } from 'vitest/config';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const RAW_ASSET = '\0raw-asset:';

function isRawAsset(id: string) {
  const file = id.split('?')[0];
  if (file.endsWith('.md') || file.endsWith('.mdx')) return true;
  // Webpack loads these with `asset/source`. Vite's CSS pipeline has no default export.
  return /(?:^|\/)tailwindcss\/.*\.css$/.test(file);
}

/**
 * Webpack's demo build imports Markdown and Tailwind's CSS as source strings.
 * A virtual id keeps Vite from parsing `.md` or injecting the CSS as a stylesheet.
 */
function rawAssetStrings() {
  return {
    name: 'raw-asset-strings',
    enforce: 'pre' as const,
    async resolveId(id: string, importer: string | undefined) {
      if (id.startsWith(RAW_ASSET) || !isRawAsset(id)) return null;
      const resolved = await this.resolve(id.split('?')[0], importer, { skipSelf: true });
      if (!resolved) return null;
      // Encode and add a `.js` suffix. `encodeURIComponent` leaves `.` alone,
      // so a bare path would still end in `.css` and Vite would treat it as CSS.
      return `${RAW_ASSET}${encodeURIComponent(resolved.id.split('?')[0])}.js`;
    },
    load(id: string) {
      if (!id.startsWith(RAW_ASSET)) return null;
      const file = decodeURIComponent(id.slice(RAW_ASSET.length, -3));
      return `export default ${JSON.stringify(fs.readFileSync(file, 'utf8'))};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), rawAssetStrings()],
  css: {
    preprocessorOptions: {
      scss: {
        // The sheets still use `@import` and the global color helpers. Silence
        // the Dart Sass 3 notices so a visual run is not a wall of warnings.
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls'],
      },
    },
  },
  resolve: {
    alias: {
      // The demo compiles Markdown in the browser, same as webpack.dev.js.
      // `fs` stays unresolved: aliasing it to browserify-fs pulls in `process`
      // during PostCSS's optional filesystem read.
      buffer: 'buffer',
      path: 'path-browserify',
      stream: 'stream-browserify',
      // Webpack's `~` prefix. Sass leaves these as CSS imports.
      '~codemirror': path.resolve(repoRoot, 'node_modules/codemirror'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    name: 'visual',
    globals: true,
    include: ['__tests__/browser/**/*.test.ts', '__tests__/browser/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // One browser, one file at a time. Parallel screenshots fight over CPU and fonts.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    browser: {
      enabled: true,
      headless: true,
      ui: false,
      commands: {
        // Same compiler the old Puppeteer suite used, so spacing tests inject
        // identical CSS. Vite's CSS pipeline would also pull in CodeMirror.
        async compileStyles(_context, files: string[]) {
          return files.map(
            file =>
              sass.compile(path.resolve(repoRoot, file), {
                silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls'],
              }).css,
          );
        },
      },
      provider: playwright({
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
        },
        contextOptions: {
          colorScheme: 'light',
          reducedMotion: 'reduce',
        },
      }),
      instances: [
        {
          browser: 'chromium',
          // The table of contents collapses below ~1200px.
          viewport: { width: 1400, height: 800 },
        },
      ],
      expect: {
        toMatchScreenshot: {
          comparatorName: 'pixelmatch',
          comparatorOptions: {
            // Small color distance covers antialiasing; any counted pixel still fails.
            threshold: 0.1,
            allowedMismatchedPixels: 0,
          },
          screenshotOptions: {
            // Tests grow the iframe to the document before this runs. A clip
            // taller than the iframe viewport is blank below the fold.
            scale: 'css',
          },
          timeout: 15_000,
          resolveDiffPath: ({ arg, browserName, ext, root, testFileName }) =>
            `${root}/__tests__/browser/__diff_output__/${testFileName}/${arg}-${browserName}${ext}`,
        },
      },
    },
  },
});
