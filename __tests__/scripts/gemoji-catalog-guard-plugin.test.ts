// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';

import webpack from 'webpack';

import gemojiCatalogGuardPlugin from '../../scripts/gemoji-catalog-guard-plugin';

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemoji-guard-'));

const compileErrors = (source: string, mode: 'development' | 'production' = 'production') =>
  new Promise<string[]>((resolve, reject) => {
    webpack(
      {
        context: path.resolve(__dirname, '../..'),
        entry: { main: `data:text/javascript,${encodeURIComponent(source)}` },
        mode,
        optimization: { minimize: false },
        output: { path: outDir },
        plugins: [gemojiCatalogGuardPlugin],
      },
      (err, stats) => (err || !stats ? reject(err) : resolve(stats.compilation.errors.map(({ message }) => message))),
    );
  });

describe('gemojiCatalogGuardPlugin', () => {
  afterAll(() => fs.rmSync(outDir, { recursive: true }));

  it('passes when main only uses nameToEmoji', async () => {
    await expect(
      compileErrors("import { nameToEmoji } from 'gemoji'; console.log(nameToEmoji.smile);"),
    ).resolves.toStrictEqual([]);
  });

  it('fails when main uses the catalog', async () => {
    await expect(compileErrors("import { gemoji } from 'gemoji'; console.log(gemoji.length);")).resolves.toStrictEqual([
      "The main entry uses gemoji's full catalog; import it in lib/owlmoji-details instead.",
    ]);
  });

  it('skips the check when export usage is not tracked', async () => {
    await expect(
      compileErrors("import { gemoji } from 'gemoji'; console.log(gemoji.length);", 'development'),
    ).resolves.toStrictEqual([]);
  });
});
