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

  describe('does not corrupt square bracket content', () => {
    it('on regular text', () => {
      const md = `
hello there [something]
`;
      const mdx = migrate(md);
      expect(mdx).toMatchInlineSnapshot(`
        "hello there \\[something]
        "
      `);
    });

    it('on a table cell value', () => {
      // We've had a case where the [] section in a table cell got accidentally replaced with another section of the content
      // Check if the [] value is correctly preserved
      const md = `
[block:parameters]
{
  "data": {
    "h-0": "Response",
    "0-0": "{'Message': 'There are validation errors', 'Errors': ['ConsumerDetails: The ExternalId or CustomerID must have a value.']}"
  },
  "cols": 2,
  "rows": 1,
  "align": [null, null]
}
[/block]
      `;

      const mdx = migrate(md);
      expect(mdx).toMatchInlineSnapshot(`
        "<Table>
          <thead>
            <tr>
              <th>
                Response
              </th>

              <th>

              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                \\{'Message': 'There are validation errors', 'Errors': ['ConsumerDetails: The ExternalId or CustomerID must have a value.']}
              </td>

              <td>

              </td>
            </tr>
          </tbody>
        </Table>
        "
      `);
    })
  })
});
