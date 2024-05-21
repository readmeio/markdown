import { mdast, mdx } from '../../index';

describe('callouts compiler', () => {
  it('compiles code tabs', () => {
    const markdown = `> 🚧 It works!
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles code tabs with no heading', () => {
    const markdown = `> 🚧
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles code tabs with no heading or body!?', () => {
    const markdown = `> 🚧
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });
});
