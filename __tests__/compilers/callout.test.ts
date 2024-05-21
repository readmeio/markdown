import { mdast, mdx } from '../../index';

describe('callouts compiler', () => {
  it('compiles callouts', () => {
    const markdown = `> 🚧 It works!
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with no heading', () => {
    const markdown = `> 🚧
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with no heading or body!?', () => {
    const markdown = `> 🚧
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with markdown in the heading', () => {
    const markdown = `> 🚧 It **works**!
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });
});
