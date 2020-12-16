/* global page */
describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 1600, height: 800 });
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
        const uri = `http://localhost:9966/#${doc}`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        const image = await page.screenshot({ fullPage: true });

        expect(image).toMatchImageSnapshot();
      }, 10000);
    });
  });
});
