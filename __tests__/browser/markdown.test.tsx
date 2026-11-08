import { page } from 'vitest/browser';

import '../../example/demo.scss';

import { renderFixture, settleImages } from './render-fixture';

/** Same viewport the old Puppeteer suite used, so the table of contents stays open. */
const VIEWPORT_WIDTH = 1400;
const VIEWPORT_HEIGHT = 800;

async function renderForScreenshot(fixture: string, search?: string) {
  // Reset in case the previous test left the iframe as tall as its document.
  await page.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  await renderFixture(fixture, search);

  // Chromium paints only the iframe viewport. An element screenshot taller
  // than that viewport is blank below the fold, so grow the iframe to fit.
  const documentHeight = () => Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  let height = VIEWPORT_HEIGHT;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    // Images below the old fold start loading only after the iframe grows.
    // eslint-disable-next-line no-await-in-loop
    await settleImages();
    const next = documentHeight();
    if (next <= height) return;
    height = next;
    // eslint-disable-next-line no-await-in-loop
    await page.viewport(VIEWPORT_WIDTH, height);
  }
}

describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    const docs = [
      'callouts',
      'calloutTests',
      'childTests',
      'codeBlocks',
      // skipping this because they sporadically failure with network timing
      // issues
      // 'embeds',
      'exportTests',
      // 'features',
      'headings',
      'images',
      'imageTests',
      // 'lists',
      'mdxComponents',
      // 'mermaid',
      'tables',
      'codeBlockTests',
      'tableOfContentsTests',
      'tailwindRootTests',
      'tutorialTile',
      'varsTest',
    ];

    it.each(docs)('renders "%s" without surprises', async doc => {
      await renderForScreenshot(doc);
      await expect(page.elementLocator(document.body)).toMatchScreenshot(doc);
    });

    it('renders callout-tests in legacy mode without surprises', async () => {
      await renderForScreenshot('calloutTests', 'ci=true&darkModeDataAttribute=true&legacy=true');
      await expect(page.elementLocator(document.body)).toMatchScreenshot('callout-tests-legacy');
    });
  });
});
