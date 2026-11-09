import { commands } from 'vitest/browser';

import { renderIsolated } from './isolated-document';

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileStyles: (files: string[]) => Promise<string[]>;
  }
}

describe('visual regression tests', () => {
  let columnsStyles: string;
  let markdownStyles: string;
  let tabsStyles: string;

  beforeAll(async () => {
    [columnsStyles, markdownStyles, tabsStyles] = await commands.compileStyles([
      'components/Columns/style.scss',
      'styles/main.scss',
      'components/Tabs/style.scss',
    ]);
  });

  it('preserves component-owned top margins between adjacent TabContent children', () => {
    const { doc, view } = renderIsolated(
      `${tabsStyles}
        .configured-spacing { --markdown-spacing: 20px; }
        .markdown-body pre { margin-top: 7px; }
        .markdown-body blockquote { margin-top: 11px; }`,
      `<div class="markdown-body configured-spacing">
        <div class="TabGroup">
          <div class="TabContent">
            <div>first</div>
            <pre>code</pre>
            <blockquote>quote</blockquote>
          </div>
        </div>
      </div>`,
    );

    const [, pre, blockquote] = doc.querySelectorAll('.TabContent > *');
    const margins = {
      blockquoteTop: view.getComputedStyle(blockquote).marginTop,
      preBottom: view.getComputedStyle(pre).marginBottom,
      preTop: view.getComputedStyle(pre).marginTop,
    };

    expect(margins.blockquoteTop).toBe('11px');
    expect(margins.preBottom).toBe('20px');
    expect(margins.preTop).toBe('7px');

    const configured = doc.querySelector('.configured-spacing');
    if (!configured) throw new Error('missing spacing root');
    configured.classList.remove('configured-spacing');
    const fallbackSpacing = view.getComputedStyle(configured.querySelector('pre')!).marginBottom;

    expect(fallbackSpacing).toBe('15px');
  });

  it('keeps a list-leading callout body on the same line as the floated icon', () => {
    const { doc } = renderIsolated(
      markdownStyles,
      `<div class="markdown-body">
        <blockquote class="callout callout_info" theme="📘">
          <span class="callout-icon">📘</span>
          <ul><li>first</li><li>second</li></ul>
        </blockquote>
        <blockquote class="callout callout_warn" theme="🚧">
          <span class="callout-icon">🚧</span>
          <p class="callout-heading empty"></p>
          <ol><li>first</li><li>second</li></ol>
        </blockquote>
      </div>`,
    );

    const tops = [...doc.querySelectorAll('.callout')].map(callout => {
      const icon = callout.querySelector('.callout-icon')!.getBoundingClientRect();
      const [first, second] = [...callout.querySelectorAll('li')].map(li => li.getBoundingClientRect());
      return { first: first.top - icon.top, second: second.top - icon.top };
    });

    tops.forEach(({ first, second }) => {
      // the first item sits beside the icon; the rest still clear it
      expect(Math.abs(first)).toBeLessThan(4);
      expect(second).toBeGreaterThan(first);
    });
  });

  // CX-3988: margin-less block wrappers (e.g. tables) sat flush against the next block in callouts
  it('spaces margin-less blocks inside a callout like at the top level', () => {
    const { doc, view } = renderIsolated(
      `${markdownStyles}${columnsStyles}`,
      `<div class="markdown-body">
        <blockquote class="callout callout_info" theme="📘">
          <span class="callout-icon">📘</span>
          <h3 class="callout-heading">Title</h3>
          <div class="rdmd-table"><div class="rdmd-table-inner"><table><tr><td>cell</td></tr></table></div></div>
          <div class="CodeTabs CodeTabs_initial"><div class="CodeTabs-inner"><pre><code>code</code></pre></div></div>
          <div class="Columns"><div class="Column"><p>column</p></div></div>
          <div class="Columns"><div class="Column">bare text column</div></div>
          <div class="rdmd-table"><div class="rdmd-table-inner"><table><tr><td>last</td></tr></table></div></div>
        </blockquote>
      </div>`,
    );

    const marginsBottom = [...doc.querySelectorAll('.callout > *')].map(
      child => view.getComputedStyle(child).marginBottom,
    );

    // the icon and heading keep their own margins; code blocks and the last child stay flush
    expect(marginsBottom).toStrictEqual(['0px', '10px', '15px', '0px', '15px', '15px', '0px']);

    // code blocks already hold a 15px margin inside their box, so the gap isn't doubled
    const code = doc.querySelector('.CodeTabs');
    if (!code) throw new Error('missing code tabs');
    const codeGap = Math.round(
      code.nextElementSibling!.getBoundingClientRect().top - code.querySelector('pre')!.getBoundingClientRect().bottom,
    );

    expect(codeGap).toBe(15);

    // columns keep a single 15px gap whether or not their content ends with a margin
    const columnGaps = [...doc.querySelectorAll('.callout > .Columns')].map(column => {
      const content = doc.createRange();
      content.selectNodeContents(column);
      return Math.round(
        column.nextElementSibling!.getBoundingClientRect().top - content.getBoundingClientRect().bottom,
      );
    });

    expect(columnGaps).toStrictEqual([15, 15]);
  });
});
