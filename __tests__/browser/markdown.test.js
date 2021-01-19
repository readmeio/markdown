/* global page */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 1000, height: 800 });
    });

    const docs = [
      'callouts',
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
  });
});
