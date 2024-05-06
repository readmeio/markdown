import { mdast, mdx } from '../../index';

describe('code-tabs compiler', () => {
  it.skip('compiles code tabs', () => {
    const markdown = `\`\`\`
const works = true;
\`\`\`
\`\`\`
const cool = true;
\`\`\`
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it.skip('compiles code tabs with metadata', () => {
    const markdown = `\`\`\`js Testing
const works = true;
\`\`\`
\`\`\`js
const cool = true;
\`\`\`
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });
});
