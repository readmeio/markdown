/* global page */
describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    it('renders without surprises', async () => {
      const uri = 'http://localhost:9966';
      const response = await page.goto(uri);
      expect(response.status()).toStrictEqual(200);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });
  });
});
