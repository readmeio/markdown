/* global page */

// eslint-disable-next-line no-promise-executor-return
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('visual regression tests', () => {
  beforeEach(async () => {
    // The ToC disappears somewhere below 1200, 1175-ish?
    await page.setViewport({ width: 1400, height: 800 });
  });

  describe.each([false, true])('rdmd syntax with mdx=%s', mdx => {
    const docs = [
      'callouts',
      'calloutTests',
      'codeBlocks',
      'embeds',
      'features',
      'headings',
      'images',
      'lists',
      'tables',
      'tablesTests',
      'codeBlockTests',
      'tableOfContentsTests',
      'varsTest',
    ];

    const skipMDX = ['callouts', 'embeds', 'lists', 'tables'];

    it.each(docs.filter(doc => !mdx || !skipMDX.includes(doc)))(
      'renders "%s" without surprises',
      async doc => {
        const uri = `http://localhost:9966/?ci=true&mdx=${mdx}#${doc}`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        await sleep(500);

        const image = await page.screenshot({ fullPage: true });

        expect(image).toMatchImageSnapshot();
      },
      10000
    );

    (mdx ? it.skip : it)(
      'renders html blocks, style tags, and style attributes with safeMode off',
      async () => {
        const uri = `http://localhost:9966/?ci=true&mdx=${mdx}#sanitizingTests`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        await sleep(500);

        const image = await page.screenshot({ fullPage: true });

        // eslint-disable-next-line jest/no-standalone-expect
        expect(image).toMatchImageSnapshot();
      },
      10000
    );

    (mdx ? it.skip : it)(
      'does not render html blocks, style tags, and style attributes with safeMode on',
      async () => {
        const uri = `http://localhost:9966/?ci=true&safe-mode=true&mdx=${mdx}#sanitizingTests`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        await sleep(500);

        const image = await page.screenshot({ fullPage: true });

        // eslint-disable-next-line jest/no-standalone-expect
        expect(image).toMatchImageSnapshot();
      },
      10000
    );
  });
});
