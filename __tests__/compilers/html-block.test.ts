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

    expect(callout.tagName).toBe('Callout');

    const htmlBlock = findHTMLBlock(callout);
    expect(htmlBlock?.tagName).toBe('html-block');
    expect(htmlBlock?.properties?.html).toBe('  <strong style="color: olive">Hello, World!</strong>');
    expect(htmlBlock?.properties?.html).not.toMatch(/^>/m);
  });

  it('compiles html blocks preserving newlines', () => {
    const markdown = `<HTMLBlock>{\`
<pre><code>
const foo = () => {
  const bar = {
    baz: 'blammo'
  }

  return bar
}
</code></pre>
\`}</HTMLBlock>`;

    const hast = mdxish(markdown);
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock?.tagName).toBe('html-block');

    const htmlProp = htmlBlock?.properties?.html as string;
    expect(htmlProp).toContain('<pre><code>');
    expect(htmlProp).toContain('const foo = () => {');
    expect(htmlProp).toContain("baz: 'blammo'");
    expect(htmlProp).toContain('</code></pre>');
  });

  it('adds newlines for readability', () => {
    const hast = mdxish('<HTMLBlock>{`<p><strong">Hello</strong>, World!</p>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock?.tagName).toBe('html-block');
    expect(htmlBlock?.properties?.html).toBe('<p><strong">Hello</strong>, World!</p>');
  });

  it('unescapes backticks in HTML content', () => {
    const hast = mdxish('<HTMLBlock>{`<code>\\`example\\`</code>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock?.tagName).toBe('html-block');
    expect(htmlBlock?.properties?.html).toBe('<code>`example`</code>');
  });

  it('passes safeMode property correctly', () => {
    const hast = mdxish('<HTMLBlock safeMode={true}>{`<script>alert("XSS")</script><p>Content</p>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock?.tagName).toBe('html-block');
    expect(htmlBlock?.properties?.safeMode).toBe('true');
    expect(htmlBlock?.properties?.html).toBe('<script>alert("XSS")</script><p>Content</p>');
  });

  it('handles template literal with variables', () => {
    // eslint-disable-next-line quotes
    const hast = mdxish(`<HTMLBlock>{\`<code>const x = \${variable}</code>\`}</HTMLBlock>`);
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock?.tagName).toBe('html-block');
    // eslint-disable-next-line no-template-curly-in-string
    expect(htmlBlock?.properties?.html).toBe('<code>const x = ${variable}</code>');
  });

  it('handles nested template literals', () => {
    const hast = mdxish('<HTMLBlock>{`<pre>\\`\\`\\`javascript\\nconst x = 1;\\n\\`\\`\\`</pre>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock?.tagName).toBe('html-block');
    expect(htmlBlock?.properties?.html).toBe('<pre>```javascript\nconst x = 1;\n```</pre>');
  });

  describe('flow-level (standalone block)', () => {
    it('handles simple single-line HTMLBlock', () => {
      const hast = mdxish('<HTMLBlock>{`<div>hello</div>`}</HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<div>hello</div>');
    });

    it('handles multiline content', () => {
      const markdown = `<HTMLBlock>{\`
<ul>
  <li>one</li>
  <li>two</li>
</ul>
\`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<li>one</li>');
      expect(htmlProp).toContain('<li>two</li>');
    });

    it('handles content with blank lines', () => {
      const markdown = `<HTMLBlock>{\`
<div>before</div>

<div>after</div>
\`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<div>before</div>');
      expect(htmlProp).toContain('<div>after</div>');
    });

    it('handles script tags without being consumed by the markdown parser', () => {
      const markdown = `<HTMLBlock>{\`
<script>console.log("hi")</script>
<p>visible</p>
\`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<script>console.log("hi")</script>');
      expect(htmlProp).toContain('<p>visible</p>');
    });

    it('handles style tags without being consumed by the markdown parser', () => {
      const markdown = `<HTMLBlock>{\`
<style>.red { color: red; }</style>
<p class="red">styled</p>
\`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<style>.red { color: red; }</style>');
      expect(htmlProp).toContain('<p class="red">styled</p>');
    });

    it('handles HTMLBlock without template literal syntax', () => {
      const hast = mdxish('<HTMLBlock><em>plain</em></HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<em>plain</em>');
    });

    it('handles HTMLBlock with runScripts attribute', () => {
      const hast = mdxish('<HTMLBlock runScripts="true">{`<script>doStuff()</script>`}</HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.runScripts).toBe(true);
      expect(htmlBlock?.properties?.html).toBe('<script>doStuff()</script>');
    });

    it('handles opening tag with attributes on a new line', () => {
      const markdown = '<HTMLBlock\nrunScripts="true">{`<script>void 0</script>`}</HTMLBlock>';
      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.runScripts).toBe(true);
      expect(htmlBlock?.properties?.html).toBe('<script>void 0</script>');
    });

    it('handles trailing whitespace after closing tag', () => {
      const hast = mdxish('<HTMLBlock>{`<div>hello</div>`}</HTMLBlock>   ');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<div>hello</div>');
    });
  });

  describe('text-level (inline)', () => {
    it('handles inline HTMLBlock surrounded by text', () => {
      const hast = mdxish('before <HTMLBlock>{`<span>middle</span>`}</HTMLBlock> after');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<span>middle</span>');
    });

    it('handles inline HTMLBlock at the end of a paragraph', () => {
      const hast = mdxish('some text <HTMLBlock>{`<em>italic</em>`}</HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<em>italic</em>');
    });

    it('handles inline HTMLBlock with attributes', () => {
      const hast = mdxish('text <HTMLBlock safeMode="true">{`<script>xss</script>`}</HTMLBlock> more');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.safeMode).toBe('true');
      expect(htmlBlock?.properties?.html).toBe('<script>xss</script>');
    });

    it('handles multiline inline HTMLBlock with trailing text', () => {
      const markdown = 'hello <HTMLBlock>{`<strong style="color: o\nlive">Hello, World!</strong>`}</HTMLBlock> world';
      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toContain('Hello, World!</strong>');
    });
  });

  describe('trailing text preservation', () => {
    it('preserves trailing text after single-line HTMLBlock', () => {
      const hast = mdxish('<HTMLBlock>{`<strong>Hello</strong>`}</HTMLBlock> trailing');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<strong>Hello</strong>');
    });

    it('preserves trailing text after multiline HTMLBlock', () => {
      const markdown = '<HTMLBlock>{`<strong style="color: o\nlive">Hello</strong>`}</HTMLBlock>. trailing';
      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toContain('Hello</strong>');
    });

    it('does not crash with trailing text after closing tag', () => {
      expect(() => mdxish('<HTMLBlock>{`<p>content</p>`}</HTMLBlock> hello world')).not.toThrow();
    });

    it('does not crash with trailing punctuation after closing tag', () => {
      expect(() => mdxish('<HTMLBlock>{`<p>content</p>`}</HTMLBlock>. stuff')).not.toThrow();
    });
  });

  describe('inside callouts', () => {
    it('handles HTMLBlock in a callout without stray > characters', () => {
      const markdown = `> 🚧 It compiles!
>
> <HTMLBlock>{\`
>   <strong style="color: olive">Hello, World!</strong>
> \`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const callout = hast.children[0] as Element;
      expect(callout.tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(callout);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('  <strong style="color: olive">Hello, World!</strong>');
    });

    it('handles HTMLBlock in a callout with script tags', () => {
      const markdown = `> ⚠️ Warning
>
> <HTMLBlock>{\`
>   <script>alert("test")</script>
>   <p>safe content</p>
> \`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const callout = hast.children[0] as Element;
      expect(callout.tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(callout);
      expect(htmlBlock?.tagName).toBe('html-block');

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<script>alert("test")</script>');
      expect(htmlProp).toContain('<p>safe content</p>');
      expect(htmlProp).not.toMatch(/^>/m);
    });

    it('handles HTMLBlock in a callout with blank lines in content', () => {
      const markdown = `> 🚧 Test
>
> <HTMLBlock>{\`
>   <div>first</div>
>
>   <div>second</div>
> \`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const callout = hast.children[0] as Element;
      expect(callout.tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(callout);
      expect(htmlBlock?.tagName).toBe('html-block');

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<div>first</div>');
      expect(htmlProp).toContain('<div>second</div>');
      expect(htmlProp).not.toMatch(/^>/m);
    });

    it('handles HTMLBlock in a callout with trailing whitespace', () => {
      const markdown = `> 🚧 It compiles!
>
> <HTMLBlock>{\`
>   <strong>Hello</strong>
> \`}</HTMLBlock>${' '}`;

      const hast = mdxish(markdown);
      const callout = hast.children[0] as Element;
      expect(callout.tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(callout);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('  <strong>Hello</strong>');
    });

    it('handles HTMLBlock in an empty callout (no title text)', () => {
      const markdown = `> 📘
>
> <HTMLBlock>{\`<p>body only</p>\`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const callout = hast.children[0] as Element;
      expect(callout.tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(callout);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<p>body only</p>');
    });
  });

  describe('inside blockquotes', () => {
    it('handles single-line HTMLBlock in a blockquote', () => {
      const hast = mdxish('> <HTMLBlock>{`<p>quoted</p>`}</HTMLBlock>');
      const bq = hast.children[0] as Element;
      expect(bq.tagName).toBe('blockquote');

      const htmlBlock = findHTMLBlock(bq);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<p>quoted</p>');
    });

    it('handles multiline HTMLBlock in a blockquote without stray > characters', () => {
      const markdown = `> <HTMLBlock>{\`
>   <div>line1</div>
>   <div>line2</div>
> \`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      const bq = hast.children[0] as Element;
      expect(bq.tagName).toBe('blockquote');

      const htmlBlock = findHTMLBlock(bq);
      expect(htmlBlock?.tagName).toBe('html-block');

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<div>line1</div>');
      expect(htmlProp).toContain('<div>line2</div>');
      expect(htmlProp).not.toMatch(/^>/m);
    });
  });

  describe('inside lists', () => {
    it('handles HTMLBlock in an unordered list item', () => {
      const hast = mdxish('- <HTMLBlock>{`<span>listed</span>`}</HTMLBlock>');
      const list = hast.children[0] as Element;
      expect(list.tagName).toBe('ul');

      const htmlBlock = findHTMLBlock(list);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<span>listed</span>');
    });

    it('handles HTMLBlock in an ordered list item', () => {
      const hast = mdxish('1. <HTMLBlock>{`<span>ordered</span>`}</HTMLBlock>');
      const list = hast.children[0] as Element;
      expect(list.tagName).toBe('ol');

      const htmlBlock = findHTMLBlock(list);
      expect(htmlBlock?.tagName).toBe('html-block');
      expect(htmlBlock?.properties?.html).toBe('<span>ordered</span>');
    });
  });
});
