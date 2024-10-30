import { migrate } from '../../index';

describe('migrating link refs', () => {
  it('removes unneccesary escapes from emphassis', () => {
    const md = `[FOO_BAR]`;
    const mdx = migrate(md);

    expect(mdx).toMatchInlineSnapshot(`
      "[FOO\\_BAR][FOO_BAR]
      "
    `);
  });
});
