/* global page */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const port = process.env.PORT || 9966;

describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 800, height: 800 });
    });

    const docs = [
      'callouts',
      'codeBlockTests',
      'codeBlockVarsTest',
      'codeBlocks',
      'embeds',
      'features',
      'headings',
      'images',
      'lists',
      'tables',
    ];

    docs.forEach(doc => {
      it(`renders "${doc}" without surprises`, async () => {
        const uri = `http://localhost:${port}/?ci=true#${doc}`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        await sleep(500);

        const image = await page.screenshot({ fullPage: true });

        expect(image).toMatchImageSnapshot();
      }, 10000);
    });
  });
});
