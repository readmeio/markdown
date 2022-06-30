/* global page */

// eslint-disable-next-line no-promise-executor-return
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    beforeEach(async () => {
      // At 1025 the TOC disappears
      await page.setViewport({ width: 1026, height: 800 });
    });

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
      'codeBlockTests',
      'tableOfContentsTests',
      'varsTest',
    ];

    it.each(docs)(
      'renders "%s" without surprises',
      async doc => {
        const uri = `http://localhost:9966/?ci=true#${doc}`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        await sleep(500);

        const image = await page.screenshot({ fullPage: true });

        expect(image).toMatchImageSnapshot();
      },
      10000
    );

    it('renders html blocks, style tags, and style attributes with safeMode off', async () => {
      const uri = `http://localhost:9966/?ci=true#sanitizingTests`;
      await page.goto(uri, { waitUntil: 'networkidle0' });
      await sleep(500);

      const image = await page.screenshot({ fullPage: true });

      expect(image).toMatchImageSnapshot();
    }, 10000);

    it('does not render html blocks, style tags, and style attributes with safeMode on', async () => {
      const uri = `http://localhost:9966/?ci=true&safe-mode=true#sanitizingTests`;
      await page.goto(uri, { waitUntil: 'networkidle0' });
      await sleep(500);

      const image = await page.screenshot({ fullPage: true });

      expect(image).toMatchImageSnapshot();
    }, 10000);
  });
});
