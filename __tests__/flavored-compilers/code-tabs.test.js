import { mdast, md } from '../../index';

describe('code-tabs compiler', () => {
  it('compiles code tabs', () => {
    const markdown = `\`\`\`
const works = true;
\`\`\`
\`\`\`
const cool = true;
\`\`\`
`;

    expect(md(mdast(markdown))).toBe(markdown);
  });

  it('compiles code tabs with metadata', () => {
    const markdown = `\`\`\`js Testing
const works = true;
\`\`\`
\`\`\`js
const cool = true;
\`\`\`
`;

    expect(md(mdast(markdown))).toBe(markdown);
  });
});
