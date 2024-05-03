import { mdast, mdx } from '../../index';

describe('code-tabs compiler', () => {
  it('compiles code tabs', () => {
    const markdown = `\`\`\`
const works = true;
\`\`\`
\`\`\`
const cool = true;
\`\`\`
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles code tabs with metadata', () => {
    const markdown = `\`\`\`js Testing
const works = true;
\`\`\`
\`\`\`js
const cool = true;
\`\`\`
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it("doesnt't mess with joining other blocks", () => {
    const markdown = `\`\`\`
const works = true;
\`\`\`
\`\`\`
const cool = true;
\`\`\`

## Hello!

I should stay here
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });
});
