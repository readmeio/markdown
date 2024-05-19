import { mdast, mdx } from '../../index';

describe('callout compiler', () => {
  it('compiles callouts', () => {
    const markdown = `> 🦉 Owl Facts
>
> Owls have large, tube-shaped eyes that are completely immobile. Their retinas contain many rod cells for excellent night vision and depth perception for hunting.
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });
});
