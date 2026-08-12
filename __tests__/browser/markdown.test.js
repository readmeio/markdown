/* global page */

const path = require('path');

const sass = require('sass');

const tabsStyles = sass.compile(path.resolve(__dirname, '../../components/Tabs/style.scss')).css;

// eslint-disable-next-line no-promise-executor-return
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('visual regression tests', () => {
  describe('rdmd syntax', () => {
    beforeAll(async () => {
      // try warming up the browser???
      const uri = 'http://localhost:9966/#/callouts?ci=true&darkModeDataAttribute=true';
      await page.goto(uri, { waitUntil: 'networkidle0' });
    });

    beforeEach(async () => {
      // The ToC disappears somewhere below 1200, 1175-ish?
      await page.setViewport({ width: 1400, height: 800 });
    }, 10000);

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

    it.each(docs)(
      'renders "%s" without surprises',
      async doc => {
        const uri = `http://localhost:9966/#/${doc}?ci=true&darkModeDataAttribute=true`;
        await page.goto(uri, { waitUntil: 'networkidle0' });
        await sleep(5000);

        const image = await page.screenshot({ fullPage: true });

        expect(image).toMatchImageSnapshot();
      },
      10000,
    );

    it('renders callout-tests in legacy mode without surprises', async () => {
      const uri = 'http://localhost:9966/#/calloutTests?ci=true&darkModeDataAttribute=true&legacy=true';
      await page.goto(uri, { waitUntil: 'networkidle0' });
      await sleep(5000);

      const image = await page.screenshot({ fullPage: true });

      expect(image).toMatchImageSnapshot();
    }, 10000);
  });

  it('preserves component-owned top margins between adjacent TabContent children', async () => {
    await page.setContent(`
      <style>
        ${tabsStyles}
        .configured-spacing { --markdown-spacing: 20px; }
        .markdown-body pre { margin-top: 7px; }
        .markdown-body blockquote { margin-top: 11px; }
      </style>
      <div class="markdown-body configured-spacing">
        <div class="TabGroup">
          <div class="TabContent">
            <div>first</div>
            <pre>code</pre>
            <blockquote>quote</blockquote>
          </div>
        </div>
      </div>
    `);

    const margins = await page.$$eval('.TabContent > *', ([, pre, blockquote]) => ({
      blockquoteTop: getComputedStyle(blockquote).marginTop,
      preBottom: getComputedStyle(pre).marginBottom,
      preTop: getComputedStyle(pre).marginTop,
    }));

    expect(margins.blockquoteTop).toBe('11px');
    expect(margins.preBottom).toBe('20px');
    expect(margins.preTop).toBe('7px');

    const fallbackSpacing = await page.$eval('.configured-spacing', element => {
      element.classList.remove('configured-spacing');
      return getComputedStyle(element.querySelector('pre')).marginBottom;
    });

    expect(fallbackSpacing).toBe('15px');
  });
});
