import { mdast, mdx, mdxish } from '../../index';

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

describe('mdxish code-tabs compiler', () => {
  it('compiles code tabs', () => {
    const markdown = `\`\`\`
const works = true;
\`\`\`
\`\`\`
const cool = true;
\`\`\`
`;

    const hast = mdxish(markdown);
    // Code blocks should be grouped into CodeTabs
    const firstChild = hast.children[0];
    
    expect(firstChild.type).toBe('element');
    expect(firstChild.tagName).toBe('CodeTabs');
    expect(firstChild.children).toHaveLength(2); // Two code blocks
  });

  it('compiles code tabs with metadata', () => {
    const markdown = `\`\`\`js Testing
const works = true;
\`\`\`
\`\`\`js
const cool = true;
\`\`\`
`;

    const hast = mdxish(markdown);
    const firstChild = hast.children[0];
    
    expect(firstChild.type).toBe('element');
    expect(firstChild.tagName).toBe('CodeTabs');
    expect(firstChild.children).toHaveLength(2); // Two code blocks
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

    const hast = mdxish(markdown);
    // CodeTabs should be first
    const firstChild = hast.children[0];
    expect(firstChild.type).toBe('element');
    expect(firstChild.tagName).toBe('CodeTabs');
    
    // Then heading
    const heading = hast.children.find(c => c.type === 'element' && c.tagName === 'h2');
    expect(heading).toBeDefined();
    expect(heading.tagName).toBe('h2');
  });
});
