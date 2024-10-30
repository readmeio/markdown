import { migrate } from '../../index';

describe('migrating link refs', () => {
  it('removes unneccesary escapes from emphassis', () => {
    const md = `[FOO_BAR] and [FOO__BAR]`;
    const mdx = migrate(md);

    expect(mdx).toMatchInlineSnapshot(`
      "[FOO_BAR][FOO_BAR] and [FOO__BAR][FOO__BAR]
      "
    `);
  });
});
