/* global page */

// eslint-disable-next-line no-promise-executor-return
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    beforeEach(async () => {
      // The ToC disappears somewhere below 1200, 1175-ish?
      await page.setViewport({ width: 1400, height: 800 });
    });

    const docs = [
      // 'callouts',
      'calloutTests',
      'codeBlocks',
      // 'embeds',
      //'features',
      // 'headings',
      // 'images',
      // 'lists',
      'mdxComponents',
      // 'tables',
      // 'tablesTests',
      'codeBlockTests',
      // 'tableOfContentsTests',
      'varsTest',
    ];

    it.each(docs)(
      'renders "%s" without surprises',
      async doc => {
        const uri = `http://localhost:9966/#/${doc}?ci=true`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        await sleep(500);

        const image = await page.screenshot({ fullPage: true });

        expect(image).toMatchImageSnapshot();
      },
      10000,
    );

    it.skip('renders html blocks, style tags, and style attributes with safeMode off', async () => {
      const uri = 'http://localhost:9966/#/sanitizingTests?ci=true';
      await page.goto(uri, { waitUntil: 'networkidle0' });
      await sleep(500);

      const image = await page.screenshot({ fullPage: true });

      expect(image).toMatchImageSnapshot();
    }, 10000);

    it.skip('does not render html blocks, style tags, and style attributes with safeMode on', async () => {
      const uri = 'http://localhost:9966/#/sanitizingTests?ci=true&safe-mode=true';
      await page.goto(uri, { waitUntil: 'networkidle0' });
      await sleep(500);

      const image = await page.screenshot({ fullPage: true });

      expect(image).toMatchImageSnapshot();
    }, 10000);
  });
});
