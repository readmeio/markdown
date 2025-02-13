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

    expect(ast.children[0].children[0]).toStrictEqual(
      expect.objectContaining({ lang: 'javascript', meta: 'First Title' }),
    );
    expect(ast.children[0].children[1]).toStrictEqual(expect.objectContaining({ lang: 'text', meta: null }));
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

  it('allows code tabs within container blocks', () => {
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
    expect(tree.children[0].children[0].children).toHaveLength(1);
  });
});
