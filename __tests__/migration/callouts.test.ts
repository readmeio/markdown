import { migrate } from '../helpers';

describe('migrating callouts', () => {
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
