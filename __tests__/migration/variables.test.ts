import { migrate } from '../helpers';

describe('migrating variables', () => {
  it('converts <<something>> to {user.something}', () => {
    const md = 'Hello <<name>>, your <<role>> is important.';

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "Hello {user.name}, your {user.role} is important.
      "
    `);
  });

  it('handles variables with underscores and numbers', () => {
    const md = 'User <<user_id>> has <<api_key_123>> access.';

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "User {user.user_id} has {user.api_key_123} access.
      "
    `);
  });

  it('does not affect glossary items', () => {
    const md = '<<name>> and <<glossary:Listings>>';

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "{user.name} and <Glossary>Listings</Glossary>
      "
    `);
  });
});
