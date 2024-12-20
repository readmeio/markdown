import { migrate } from '../helpers';

describe('migrating html entities', () => {
  it('removes html entity spaces', () => {
    const md = `
{
  "json": true
}
`;
    const mdx = migrate(md);

    expect(mdx).toMatchInlineSnapshot(`
      "\\{\\
        "json": true\\
      }
      "
    `);
  });
});
