import { mdast, hast } from '../../index';

describe('Code Tabs Transformer', () => {
  it('wraps single code blocks with tabs if they have a lang set', () => {
    const md = `
\`\`\`javascript
const languageSet = true;
\`\`\`
`;

    const tree = mdast(md);
    expect(tree).toMatchSnapshot();
  });

  it('wraps single code blocks with tabs if they have a title set', () => {
    const md = `
\`\`\`javascript Testing
const languageSet = true;
\`\`\`
`;

    const tree = mdast(md);
    expect(tree).toMatchSnapshot();
  });

  it('can parse code tabs', () => {
    const md = `
\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`
`;

    expect(mdast(md)).toMatchSnapshot();
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
    expect(ast.children[0].children[1]).toStrictEqual(expect.objectContaining({ lang: 'text' }));
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

    expect(hast(md)).toMatchSnapshot();
  });
});
