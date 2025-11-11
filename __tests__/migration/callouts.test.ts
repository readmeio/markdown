import { migrate } from '../helpers';

describe('migrating callouts', () => {
  it('does not error on callouts with no heading', () => {
    const md = '> ℹ️';
    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "<Callout icon="ℹ️" theme="info" />
      "
    `);
  });

  it('retains HTML content that starts a callout body', () => {
    const md = `> ⚠️ <div><b>hello</b></div>
    `;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "<Callout icon="⚠️" theme="warn">
        <div><b>hello</b></div>
      </Callout>
      "
    `);
  });
});
