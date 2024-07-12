import { mdast } from '../../../lib';
import { readdir, readFile } from 'node:fs/promises';

describe('mdast transformer', async () => {
  const cases = await Promise.all(
    (await readdir(__dirname))
      .filter(name => !name.match(/.[tj]sx?/))
      .map(async dirname => {
        return {
          name: dirname,
          mdx: await readFile(`${__dirname}/${dirname}/in.mdx`, { encoding: 'utf8' }),
          ast: JSON.parse(await readFile(`${__dirname}/${dirname}/out.json`, { encoding: 'utf8' })),
        };
      }),
  );

  it.each(cases)('parses $name', ({ mdx, ast }) => {
    // @ts-ignore
    expect(mdast(mdx)).toStrictEqualExceptPosition(ast);
  });
});
