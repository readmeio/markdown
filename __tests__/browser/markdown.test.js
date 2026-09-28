/* global page */

const path = require('path');

const sass = require('sass');

const tabsStyles = sass.compile(path.resolve(__dirname, '../../components/Tabs/style.scss')).css;
const columnsStyles = sass.compile(path.resolve(__dirname, '../../components/Columns/style.scss')).css;
const markdownStyles = sass.compile(path.resolve(__dirname, '../../styles/main.scss')).css;

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

  it('keeps a list-leading callout body on the same line as the floated icon', async () => {
    await page.setContent(`
      <style>${markdownStyles}</style>
      <div class="markdown-body">
        <blockquote class="callout callout_info" theme="📘">
          <span class="callout-icon">📘</span>
          <ul><li>first</li><li>second</li></ul>
        </blockquote>
        <blockquote class="callout callout_warn" theme="🚧">
          <span class="callout-icon">🚧</span>
          <p class="callout-heading empty"></p>
          <ol><li>first</li><li>second</li></ol>
        </blockquote>
      </div>
    `);

    const tops = await page.$$eval('.callout', callouts =>
      callouts.map(callout => {
        const icon = callout.querySelector('.callout-icon').getBoundingClientRect();
        const [first, second] = [...callout.querySelectorAll('li')].map(li => li.getBoundingClientRect());
        return { first: first.top - icon.top, second: second.top - icon.top };
      }),
    );

    tops.forEach(({ first, second }) => {
      // the first item sits beside the icon; the rest still clear it
      expect(Math.abs(first)).toBeLessThan(4);
      expect(second).toBeGreaterThan(first);
    });
  });

  // CX-3988: margin-less block wrappers (e.g. tables) sat flush against the next block in callouts
  it('spaces margin-less blocks inside a callout like at the top level', async () => {
    await page.setContent(`
      <style>${markdownStyles}${columnsStyles}</style>
      <div class="markdown-body">
        <blockquote class="callout callout_info" theme="📘">
          <span class="callout-icon">📘</span>
          <h3 class="callout-heading">Title</h3>
          <div class="rdmd-table"><div class="rdmd-table-inner"><table><tr><td>cell</td></tr></table></div></div>
          <div class="CodeTabs CodeTabs_initial"><div class="CodeTabs-inner"><pre><code>code</code></pre></div></div>
          <div class="Columns"><div class="Column"><p>column</p></div></div>
          <div class="Columns"><div class="Column">bare text column</div></div>
          <div class="rdmd-table"><div class="rdmd-table-inner"><table><tr><td>last</td></tr></table></div></div>
        </blockquote>
      </div>
    `);

    const marginsBottom = await page.$$eval('.callout > *', children =>
      children.map(child => getComputedStyle(child).marginBottom),
    );

    // the icon and heading keep their own margins; code blocks and the last child stay flush
    expect(marginsBottom).toStrictEqual(['0px', '10px', '15px', '0px', '15px', '15px', '0px']);

    // code blocks already hold a 15px margin inside their box, so the gap isn't doubled
    const codeGap = await page.$eval('.CodeTabs', code =>
      Math.round(code.nextElementSibling.getBoundingClientRect().top - code.querySelector('pre').getBoundingClientRect().bottom),
    );

    expect(codeGap).toBe(15);

    // columns keep a single 15px gap whether or not their content ends with a margin
    const columnGaps = await page.$$eval('.callout > .Columns', columns =>
      columns.map(column => {
        const content = document.createRange();
        content.selectNodeContents(column);
        return Math.round(column.nextElementSibling.getBoundingClientRect().top - content.getBoundingClientRect().bottom);
      }),
    );

    expect(columnGaps).toStrictEqual([15, 15]);
  });
});
