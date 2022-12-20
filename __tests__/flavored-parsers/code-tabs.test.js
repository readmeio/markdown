import { mdast } from '../../index';

describe('Code Tabs', () => {
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
      expect.objectContaining({ lang: 'javascript', meta: 'First Title' })
    );
    expect(ast.children[0].children[1]).toStrictEqual(expect.objectContaining({ lang: 'text', meta: '' }));
  });
});
