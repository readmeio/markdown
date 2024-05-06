import { mdast, hast } from '../../index';

describe('Code Tabs Transformer', () => {
  it('can parse code tabs', () => {
    const md = `
\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('code-tabs');
  });

  it('sets the correct data attributes', () => {
    const md = `
\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`
`;
    const tree = mdast(md);

    expect(tree.children[0].data).toMatchInlineSnapshot(`
      {
        "hName": "CodeTabs",
        "hProperties": {},
      }
    `);
  });

  it('can parse lang and meta', () => {
    const md = `
\`\`\`javascript First Title
First code block
\`\`\`
\`\`\`text
Second code block
\`\`\`
`;
    const ast = mdast(md);

    expect(ast.children[0].children[0].data).toMatchInlineSnapshot(`
      {
        "hName": "Code",
        "hProperties": {
          "lang": "javascript",
          "meta": "First Title",
          "value": "First code block",
        },
      }
    `);
    expect(ast.children[0].children[1].data).toMatchInlineSnapshot(`
      {
        "hName": "Code",
        "hProperties": {
          "lang": "text",
          "meta": null,
          "value": "Second code block",
        },
      }
    `);
  });

  it('wraps single code blocks with tabs if they have a lang set', () => {
    const md = `
\`\`\`javascript
const languageSet = true;
\`\`\`
`;

    const tree = mdast(md);
    expect(tree.children[0].type).toBe('code-tabs');
  });

  it('wraps single code blocks with tabs if they have a title set', () => {
    const md = `
\`\`\`javascript Testing
const languageSet = true;
\`\`\`
`;

    const tree = mdast(md);
    expect(tree.children[0].type).toBe('code-tabs');
  });

  it('allows code tabs within html blocks', () => {
    const md = `
<p>

\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`

</p>
`;
    const tree = hast(md);

    expect(tree.children[0].children[0].tagName).toBe('CodeTabs');
  });

  it.only('allows code tabs within container blocks', () => {
    const md = `
- ~~~Name
  {{company_name}}
  ~~~
  ~~~Email
  {{company_email}}
  ~~~
  ~~~URL
  {{company_url}}
  ~~~
`;

    const tree = mdast(md);

    expect(tree.children[0].children[0].children[0].type).toBe('code-tabs');
    expect(tree.children[0].children[0].children.length).toBe(1);
  });
});
