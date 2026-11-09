import { mdast, mdx } from '../../index';

describe('html-block compiler', () => {
  it('compiles html blocks within containers', () => {
    const markdown = `
> 🚧 It compiles!
>
> <HTMLBlock>{\`
>   <strong style="color: olive">Hello, World!</strong>
> \`}</HTMLBlock>
`;

    expect(mdx(mdast(markdown)).trim()).toBe(markdown.trim());
  });

  it('compiles html blocks preserving newlines', () => {
    const markdown = `
<HTMLBlock>{\`
<pre><code>
const foo = () => {
  const bar = {
    baz: 'blammo'
  }

  return bar
}
</code></pre>
\`}</HTMLBlock>
`;

    expect(mdx(mdast(markdown)).trim()).toBe(markdown.trim());
  });

  it('adds newlines for readability', () => {
    const markdown = '<HTMLBlock>{`<p><strong">Hello</strong>, World!</p>`}</HTMLBlock>';
    const expected = `<HTMLBlock>{\`
<p><strong">Hello</strong>, World!</p>
\`}</HTMLBlock>`;

    expect(mdx(mdast(markdown)).trim()).toBe(expected.trim());
  });
});
