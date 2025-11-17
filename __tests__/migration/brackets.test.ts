import { migrate } from '../helpers';

describe('migration of brackets', () => {
  it('should retain opening bracket after a link reference brackets', () => {
    const md = '[foo][bar';
    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "\\[foo]\\[bar
      "
    `);
  });
});
