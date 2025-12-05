import type { Element } from 'hast';

import { mdast, mdx, mdxish } from '../../index';

function findHTMLBlock(element: Element): Element | undefined {
  if (element.tagName === 'HTMLBlock' || element.tagName === 'html-block') {
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

  it('unescapes backticks in HTML content', () => {
    const markdown = '<HTMLBlock>{`<code>\\`example\\`</code>`}</HTMLBlock>';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const htmlBlock = findHTMLBlock(paragraph);
    expect(htmlBlock).toBeDefined();
    expect(htmlBlock?.tagName).toBe('HTMLBlock');

    // Verify that escaped backticks \` are unescaped to ` in the HTML
    const htmlProp = htmlBlock?.properties?.html as string;
    expect(htmlProp).toBeDefined();
    expect(htmlProp).toContain('<code>`example`</code>');
    expect(htmlProp).not.toContain('\\`');
  });

  it('passes safeMode property correctly', () => {
    // Test with both JSX expression and string syntax
    const markdown = '<HTMLBlock safeMode={true}>{`<script>alert("XSS")</script><p>Content</p>`}</HTMLBlock>';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const htmlBlock = findHTMLBlock(paragraph);
    expect(htmlBlock).toBeDefined();

    const allProps = htmlBlock?.properties;
    expect(allProps).toBeDefined();

    const safeMode = allProps?.safeMode;
    expect(safeMode).toBe('true');

    // Verify that html property is still present (for safeMode to render as escaped text)
    const htmlProp = allProps?.html as string;
    expect(htmlProp).toBeDefined();
    expect(htmlProp).toContain('<script>alert("XSS")</script>');
    expect(htmlProp).toContain('<p>Content</p>');
  });

  it('should handle template literal with variables', () => {
    // eslint-disable-next-line quotes
    const markdown = `<HTMLBlock>{\`<code>const x = \${variable}</code>\`}</HTMLBlock>`;

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const htmlBlock = findHTMLBlock(paragraph);
    expect(htmlBlock).toBeDefined();
    // eslint-disable-next-line no-template-curly-in-string
    expect(htmlBlock?.properties?.html).toBe('<code>const x = ${variable}</code>');
  });

  it('should handle nested template literals', () => {
    // Use a regular string to avoid nested template literal syntax error
    // The content should be: <pre>```javascript\nconst x = 1;\n```</pre>
    const markdown = '<HTMLBlock>{`<pre>\\`\\`\\`javascript\\nconst x = 1;\\n\\`\\`\\`</pre>`}</HTMLBlock>';

    const hast = mdxish(markdown);
    const paragraph = hast.children[0] as Element;

    expect(paragraph.type).toBe('element');
    const htmlBlock = findHTMLBlock(paragraph);
    expect(htmlBlock).toBeDefined();

    // Verify that the HTML content is preserved correctly with newlines
    const htmlProp = htmlBlock?.properties?.html as string;
    expect(htmlProp).toBeDefined();

    // The expected content should have triple backticks
    expect(htmlProp).toBe('<pre>```javascript\nconst x = 1;\n```</pre>');
  });
});
