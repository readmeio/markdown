import fs from 'node:fs';

import { migrate } from '../../helpers';

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
      "<HTMLBlock>
        {"<a href=\\"example.com\\">\`example.com\`</a>"}
      </HTMLBlock>
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
      "<HTMLBlock>
        {"<a href=\\"example.com\\">\\\\\`example.com\\\\\`</a>"}
      </HTMLBlock>
      "
    `);
  });

  it.only('does not unescape backslashes', async () => {
    const md = fs.readFileSync(`${__dirname}/fixtures/html-block-escapes/in.md`, 'utf-8');

    await expect(migrate(md)).toMatchFileSnapshot(`${__dirname}/fixtures/html-block-escapes/out.mdx`);
  });

  it('correctly migrates html with newlines', async () => {
    const md = fs.readFileSync(`${__dirname}/fixtures/html-block-escapes-newlines/in.md`, 'utf-8');

    await expect(migrate(md)).toMatchFileSnapshot(`${__dirname}/fixtures/html-block-escapes-newlines/out.mdx`);
  });
});
