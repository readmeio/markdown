import { migrate } from '../helpers';

describe('mdx migration of link references', () => {
  it('compiles link references correctly', () => {
    const md = '[wat_wat]';

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "\\[wat\\_wat]
      "
    `);
  });

  it('compiles link references with defintions correctly', () => {
    const md = `
[wat_wat]

[wat_wat]: https://wat.com
`;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "[wat_wat]

      [wat_wat]: https://wat.com
      "
    `);
  });

  it('compiles link references like syntax', () => {
    const md = `
[* Wat]: <-- must be capitalized
`;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "[* Wat]: \\<-- must be capitalized
      "
    `);
  });
});
