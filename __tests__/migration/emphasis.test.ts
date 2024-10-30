import { migrate } from '../../index';

describe('migrating emphasis', () => {
  it('trims whitespace surrounding phrasing content (emphasis, strong, etc)', () => {
    const md = '** bold ** and _ italic _ and ***   bold italic ***';

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "**bold** and *italic* and ***bold italic***
      "
    `);
  });

  it('moves whitespace surrounding phrasing content (emphasis, strong, etc) to the appropriate place', () => {
    const md = '**bold **and also_ italic_ and*** bold italic***aaaaaah';

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "**bold** and also *italic* and ***bold italic***aaaaaah
      "
    `);
  });

  it('migrates a complex case', () => {
    const md =
      '*the recommended initial action is to**initiate a[reversal operation (rollback)](https://docs.jupico.com/reference/ccrollback)**. *';

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "*the recommended initial action is to**initiate a[reversal operation (rollback)](https://docs.jupico.com/reference/ccrollback)**.*
      "
    `);
  });

  it('removes unneccesary escapes from emphasis', () => {
    const md = `[FOO_BAR] and [FOO__BAR]`;
    const mdx = migrate(md);

    expect(mdx).toMatchInlineSnapshot(`
      "[FOO_BAR][FOO_BAR] and [FOO__BAR][FOO__BAR]
      "
    `);
  });

  it('migrates deprecated internal emphasis', () => {
    const md = `Foo__Bar__Baz`;
    const mdx = migrate(md);

    expect(mdx).toMatchInlineSnapshot(`
      "Foo**Bar**Baz
      "
    `);
  });
});
