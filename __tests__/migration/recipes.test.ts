import { migrate } from '../helpers';

describe('mdx migration of recipes', () => {
  it('compiles recipes correctly', () => {
    const md = `
In a callout:

> 🚀 Launch Example Code:
>
> [block:tutorial-tile]{"backgroundColor":"#0b1c36","emoji":"👉","id":"67d85229d1ac0900248b3111","link":"https://developer.moneygram.com/v1.0/recipes/amend-modify-receviers-name-headers","slug":"amend-modify-receviers-name-headers","title":"Amend - Modify Recevier's Name - Headers"}[/block]

Or on a line by itself:

[block:tutorial-tile]
{
  "backgroundColor":"#0b1c36",
  "emoji":"👉",
  "id":"67d85229d1ac0900248b3111",
  "link":"https://developer.moneygram.com/v1.0/recipes/amend-modify-receviers-name-headers",
  "slug":"amend-modify-receviers-name-headers",
  "title":"Amend - Modify Recevier's Name - Headers"
}
[/block]
    `;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "In a callout:

      <Callout icon="🚀" theme="default">
        ### Launch Example Code:

        <Recipe backgroundColor="#0b1c36" emoji="👉" slug="amend-modify-receviers-name-headers" title="Amend - Modify Recevier's Name - Headers" />
      </Callout>

      Or on a line by itself:

      <Recipe backgroundColor="#0b1c36" emoji="👉" slug="amend-modify-receviers-name-headers" title="Amend - Modify Recevier's Name - Headers" />
      "
    `);
  });
});