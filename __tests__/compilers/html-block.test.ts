import type { Element } from 'hast';

import { mdast, mdx, mdxish } from '../../index';

function findHTMLBlock(element: Element): Element | undefined {
  if (element.tagName === 'HTMLBlock') {
    return element;
  }
  return element.children
    .filter((child): child is Element => child.type === 'element')
    .reduce<Element | undefined>((found, child) => found || findHTMLBlock(child), undefined);
}

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

describe('mdxish html-block compiler', () => {
  it('compiles html blocks within containers', () => {
    const markdown = `
> 🚧 It compiles!
>
> <HTMLBlock>{\`
>   <strong style="color: olive">Hello, World!</strong>
> \`}</HTMLBlock>
`;

    const hast = mdxish(markdown.trim());
    const callout = hast.children[0] as Element;

    expect(callout.type).toBe('element');
    expect(callout.tagName).toBe('Callout');

    // Find HTMLBlock within the callout
    const htmlBlock = findHTMLBlock(callout);
    expect(htmlBlock).toBeDefined();
    expect(htmlBlock?.tagName).toBe('HTMLBlock');
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

    const hast = mdxish(markdown.trim());
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const htmlBlock = findHTMLBlock(paragraph);
    expect(htmlBlock).toBeDefined();
    expect(htmlBlock?.tagName).toBe('HTMLBlock');
  });

  it('adds newlines for readability', () => {
    const markdown = '<HTMLBlock>{`<p><strong">Hello</strong>, World!</p>`}</HTMLBlock>';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const htmlBlock = findHTMLBlock(paragraph);
    expect(htmlBlock).toBeDefined();
    expect(htmlBlock?.tagName).toBe('HTMLBlock');
  });
});
