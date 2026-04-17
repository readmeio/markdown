import type { Element } from 'hast';
import type { Root } from 'mdast';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { mdxish } from '../../index';
import { htmlBlockComponentFromMarkdown } from '../../lib/mdast-util/html-block-component';
import { htmlBlockComponent } from '../../lib/micromark/html-block-component/syntax';
import mdxishHtmlBlocks from '../../processor/transform/mdxish/mdxish-html-blocks';
import { collectNodes } from '../helpers';

interface HTMLBlockNode {
  children: { type: string; value: string }[];
  data: {
    hName: string;
    hProperties: Record<string, boolean | string | undefined>;
  };
  type: string;
}

const parseWithPlugin = (markdown: string): Root => {
  const processor = unified()
    .data('micromarkExtensions', [htmlBlockComponent()])
    .data('fromMarkdownExtensions', [htmlBlockComponentFromMarkdown()])
    .use(remarkParse)
    .use(mdxishHtmlBlocks);
  const tree = processor.parse(markdown);
  processor.runSync(tree);
  return tree as Root;
};

const findHtmlBlockNodes = (tree: Root): HTMLBlockNode[] =>
  collectNodes(tree, node => node.type === 'html-block') as unknown as HTMLBlockNode[];

function findHTMLBlock(element: Element): Element | undefined {
  if (element.tagName === 'HTMLBlock' || element.tagName === 'html-block') {
    return element;
  }
  return element.children
    .filter((child): child is Element => child.type === 'element')
    .reduce<Element | undefined>((found, child) => found || findHTMLBlock(child), undefined);
}

describe('mdxish-html-blocks transformer', () => {
  describe('attribute extraction', () => {
    it('extracts safeMode from JSX syntax', () => {
      const tree = parseWithPlugin('<HTMLBlock safeMode={true}>{`<p>content</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties).toMatchObject({ safeMode: 'true', html: '<p>content</p>' });
    });

    it('extracts safeMode from string syntax', () => {
      const tree = parseWithPlugin('<HTMLBlock safeMode="false">{`<p>content</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties).toMatchObject({ safeMode: 'false', html: '<p>content</p>' });
    });

    it('extracts runScripts boolean true', () => {
      const tree = parseWithPlugin('<HTMLBlock runScripts="true">{`<p>content</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties.runScripts).toBe(true);
    });

    it('extracts runScripts boolean false', () => {
      const tree = parseWithPlugin('<HTMLBlock runScripts="false">{`<p>content</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties.runScripts).toBe(false);
    });

    it('extracts runScripts string value', () => {
      const tree = parseWithPlugin('<HTMLBlock runScripts="afterRender">{`<p>content</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties.runScripts).toBe('afterRender');
    });

    it('extracts multiple attributes', () => {
      const tree = parseWithPlugin(
        '<HTMLBlock safeMode={true} runScripts="true">{`<p>content</p>`}</HTMLBlock>',
      );
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties).toMatchObject({ safeMode: 'true', runScripts: true });
    });

    it('omits runScripts and safeMode when absent', () => {
      const tree = parseWithPlugin('<HTMLBlock>{`<p>content</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties).toStrictEqual({ html: '<p>content</p>' });
    });
  });

  describe('content extraction', () => {
    it('strips template literal delimiters', () => {
      const tree = parseWithPlugin('<HTMLBlock>{`<div>hello</div>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties.html).toBe('<div>hello</div>');
    });

    it('handles content without template literal syntax', () => {
      const tree = parseWithPlugin('<HTMLBlock><em>plain</em></HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties.html).toBe('<em>plain</em>');
    });

    it('unescapes backticks in HTML content', () => {
      const tree = parseWithPlugin('<HTMLBlock>{`<code>\\`example\\`</code>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.data.hProperties.html).toBe('<code>`example`</code>');
    });

    it('preserves multiline content', () => {
      const markdown = `<HTMLBlock>{\`
<ul>
  <li>one</li>
  <li>two</li>
</ul>
\`}</HTMLBlock>`;
      const tree = parseWithPlugin(markdown);
      const [node] = findHtmlBlockNodes(tree);
      const html = node.data.hProperties.html as string;
      expect(html).toContain('<li>one</li>');
      expect(html).toContain('<li>two</li>');
    });
  });

  describe('node structure', () => {
    it('produces correct node type and hName', () => {
      const tree = parseWithPlugin('<HTMLBlock>{`<p>test</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.type).toBe('html-block');
      expect(node.data.hName).toBe('html-block');
    });

    it('sets children text node matching html property', () => {
      const tree = parseWithPlugin('<HTMLBlock>{`<p>test</p>`}</HTMLBlock>');
      const [node] = findHtmlBlockNodes(tree);
      expect(node.children).toStrictEqual([{ type: 'text', value: '<p>test</p>' }]);
    });

    it('does not transform non-HTMLBlock html nodes', () => {
      const tree = parseWithPlugin('<div>just html</div>');
      const htmlBlockNodes = findHtmlBlockNodes(tree);
      expect(htmlBlockNodes).toHaveLength(0);
    });
  });
});

describe('mdxish html-block integration', () => {
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
    expect(htmlBlock).toMatchObject({
      tagName: 'html-block',
      properties: { html: '  <strong style="color: olive">Hello, World!</strong>' },
    });
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
    expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

    const htmlProp = htmlBlock?.properties?.html as string;
    expect(htmlProp).toContain('<pre><code>');
    expect(htmlProp).toContain('const foo = () => {');
    expect(htmlProp).toContain("baz: 'blammo'");
    expect(htmlProp).toContain('</code></pre>');
  });

  it('adds newlines for readability', () => {
    const hast = mdxish('<HTMLBlock>{`<p><strong">Hello</strong>, World!</p>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock).toMatchObject({
      tagName: 'html-block',
      properties: { html: '<p><strong">Hello</strong>, World!</p>' },
    });
  });

  it('unescapes backticks in HTML content', () => {
    const hast = mdxish('<HTMLBlock>{`<code>\\`example\\`</code>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock).toMatchObject({
      tagName: 'html-block',
      properties: { html: '<code>`example`</code>' },
    });
  });

  it('passes safeMode property correctly', () => {
    const hast = mdxish('<HTMLBlock safeMode={true}>{`<script>alert("XSS")</script><p>Content</p>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock).toMatchObject({
      tagName: 'html-block',
      properties: { safeMode: 'true', html: '<script>alert("XSS")</script><p>Content</p>' },
    });
  });

  it('handles template literal with variables', () => {
    // eslint-disable-next-line quotes
    const hast = mdxish(`<HTMLBlock>{\`<code>const x = \${variable}</code>\`}</HTMLBlock>`);
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock).toMatchObject({
      tagName: 'html-block',
      // eslint-disable-next-line no-template-curly-in-string
      properties: { html: '<code>const x = ${variable}</code>' },
    });
  });

  it('handles nested template literals', () => {
    const hast = mdxish('<HTMLBlock>{`<pre>\\`\\`\\`javascript\\nconst x = 1;\\n\\`\\`\\`</pre>`}</HTMLBlock>');
    const htmlBlock = findHTMLBlock(hast.children[0] as Element);
    expect(htmlBlock).toMatchObject({
      tagName: 'html-block',
      properties: { html: '<pre>```javascript\nconst x = 1;\n```</pre>' },
    });
  });

  describe('flow-level (standalone block)', () => {
    it('handles simple single-line HTMLBlock', () => {
      const hast = mdxish('<HTMLBlock>{`<div>hello</div>`}</HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<div>hello</div>' },
      });
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
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

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
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

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
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

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
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<style>.red { color: red; }</style>');
      expect(htmlProp).toContain('<p class="red">styled</p>');
    });

    it('handles HTMLBlock without template literal syntax', () => {
      const hast = mdxish('<HTMLBlock><em>plain</em></HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<em>plain</em>' },
      });
    });

    it('handles HTMLBlock with runScripts attribute', () => {
      const hast = mdxish('<HTMLBlock runScripts="true">{`<script>doStuff()</script>`}</HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { runScripts: true, html: '<script>doStuff()</script>' },
      });
    });

    it('handles opening tag with attributes on a new line', () => {
      const markdown = '<HTMLBlock\nrunScripts="true">{`<script>void 0</script>`}</HTMLBlock>';
      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { runScripts: true, html: '<script>void 0</script>' },
      });
    });

    it('handles trailing whitespace after closing tag', () => {
      const hast = mdxish('<HTMLBlock>{`<div>hello</div>`}</HTMLBlock>   ');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<div>hello</div>' },
      });
    });
  });

  describe('text-level (inline)', () => {
    it('handles inline HTMLBlock surrounded by text', () => {
      const hast = mdxish('before <HTMLBlock>{`<span>middle</span>`}</HTMLBlock> after');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<span>middle</span>' },
      });
    });

    it('handles inline HTMLBlock at the end of a paragraph', () => {
      const hast = mdxish('some text <HTMLBlock>{`<em>italic</em>`}</HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<em>italic</em>' },
      });
    });

    it('handles inline HTMLBlock with attributes', () => {
      const hast = mdxish('text <HTMLBlock safeMode="true">{`<script>xss</script>`}</HTMLBlock> more');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { safeMode: 'true', html: '<script>xss</script>' },
      });
    });

    it('handles multiline inline HTMLBlock with trailing text', () => {
      const markdown = 'hello <HTMLBlock>{`<strong style="color: o\nlive">Hello, World!</strong>`}</HTMLBlock> world';
      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });
      expect(htmlBlock?.properties?.html).toContain('Hello, World!</strong>');
    });
  });

  describe('trailing text preservation', () => {
    it('preserves trailing text after single-line HTMLBlock', () => {
      const hast = mdxish('<HTMLBlock>{`<strong>Hello</strong>`}</HTMLBlock> trailing');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<strong>Hello</strong>' },
      });
    });

    it('preserves trailing text after multiline HTMLBlock', () => {
      const markdown = '<HTMLBlock>{`<strong style="color: o\nlive">Hello</strong>`}</HTMLBlock>. trailing';
      const hast = mdxish(markdown);
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });
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
      expect((hast.children[0] as Element).tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '  <strong style="color: olive">Hello, World!</strong>' },
      });
    });

    it('handles HTMLBlock in a callout with script tags', () => {
      const markdown = `> ⚠️ Warning
>
> <HTMLBlock>{\`
>   <script>alert("test")</script>
>   <p>safe content</p>
> \`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      expect((hast.children[0] as Element).tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

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
      expect((hast.children[0] as Element).tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

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
      expect((hast.children[0] as Element).tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '  <strong>Hello</strong>' },
      });
    });

    it('handles HTMLBlock in an empty callout (no title text)', () => {
      const markdown = `> 📘
>
> <HTMLBlock>{\`<p>body only</p>\`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      expect((hast.children[0] as Element).tagName).toBe('Callout');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<p>body only</p>' },
      });
    });
  });

  describe('inside blockquotes', () => {
    it('handles single-line HTMLBlock in a blockquote', () => {
      const hast = mdxish('> <HTMLBlock>{`<p>quoted</p>`}</HTMLBlock>');
      expect((hast.children[0] as Element).tagName).toBe('blockquote');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<p>quoted</p>' },
      });
    });

    it('handles multiline HTMLBlock in a blockquote without stray > characters', () => {
      const markdown = `> <HTMLBlock>{\`
>   <div>line1</div>
>   <div>line2</div>
> \`}</HTMLBlock>`;

      const hast = mdxish(markdown);
      expect((hast.children[0] as Element).tagName).toBe('blockquote');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<div>line1</div>');
      expect(htmlProp).toContain('<div>line2</div>');
      expect(htmlProp).not.toMatch(/^>/m);
    });
  });

  describe('inside lists', () => {
    it('handles HTMLBlock in an unordered list item', () => {
      const hast = mdxish('- <HTMLBlock>{`<span>listed</span>`}</HTMLBlock>');
      expect((hast.children[0] as Element).tagName).toBe('ul');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<span>listed</span>' },
      });
    });

    it('handles HTMLBlock in an ordered list item', () => {
      const hast = mdxish('1. <HTMLBlock>{`<span>ordered</span>`}</HTMLBlock>');
      expect((hast.children[0] as Element).tagName).toBe('ol');

      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<span>ordered</span>' },
      });
    });
  });

  describe('edge cases', () => {
    it('handles standalone multiline HTMLBlock with surrounding paragraphs', () => {
      const markdown = `Hello

<HTMLBlock>{\`
<p><strong">Hello</strong>, World!</p>
\`}</HTMLBlock>

there`;
      const hast = mdxish(markdown);
      const htmlBlock = (hast.children as Element[])
        .filter(child => child.type === 'element')
        .reduce<Element | undefined>((found, child) => found || findHTMLBlock(child), undefined);
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });
      expect(htmlBlock?.properties?.html).toContain('Hello</strong>, World!</p>');
    });

    it('handles nested HTMLBlock tags in content', () => {
      const hast = mdxish('<HTMLBlock>{`<HTMLBlock>{inner}</HTMLBlock>`}</HTMLBlock>');
      const htmlBlock = findHTMLBlock(hast.children[0] as Element);
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });
      expect(htmlBlock?.properties?.html).toContain('<HTMLBlock>{inner}</HTMLBlock>');
    });
  });
});
