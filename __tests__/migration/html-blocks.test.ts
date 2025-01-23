import { migrate } from '../helpers';

describe('migrating html blocks', () => {
  it('correctly escapes back ticks', () => {
    const md = `
[block:html]
{
  "html": "<a href=\\"example.com\\">\`example.com\`</a>"
}
[/block]
`;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "<HTMLBlock>{\`
      <a href="example.com">${'\\`example.com\\`'}</a>
      \`}</HTMLBlock>
      "
    `);
  });

  it('does not escape already escaped backticks', () => {
    const md = `
[block:html]
{
  "html": "<a href=\\"example.com\\">${'\\\\`example.com\\\\`'}</a>"
}
[/block]
`;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "<HTMLBlock>{\`
      <a href="example.com">${'\\`example.com\\`'}</a>
      \`}</HTMLBlock>
      "
    `);
  });
});
