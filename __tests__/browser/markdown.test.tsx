import { page } from 'vitest/browser';

import '../../example/demo.scss';

import { renderFixture } from './render-fixture';

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
      await renderFixture(doc);
      await expect(page.elementLocator(document.body)).toMatchScreenshot(doc);
    });

    it('renders callout-tests in legacy mode without surprises', async () => {
      await renderFixture('calloutTests', 'ci=true&darkModeDataAttribute=true&legacy=true');
      await expect(page.elementLocator(document.body)).toMatchScreenshot('callout-tests-legacy');
    });
  });
});
