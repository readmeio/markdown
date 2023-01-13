import { mdast } from '../../index';

describe('Single Code Tab Transformer', () => {
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
});
