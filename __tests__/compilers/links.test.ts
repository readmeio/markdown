import { mdast, mdx } from '../../index';

describe('link compiler', () => {
  it('compiles links without extra attributes', () => {
    const markdown = '<Anchor href="https://readme.com">ReadMe</Anchor>';

    expect(mdx(mdast(markdown)).trim()).toBe('[ReadMe](https://readme.com)');
  });

  it('compiles links with extra attributes', () => {
    const markdown = '<Anchor target="_blank" href="https://readme.com">ReadMe</Anchor>';

    expect(mdx(mdast(markdown))).toBe(markdown);
  });
});
