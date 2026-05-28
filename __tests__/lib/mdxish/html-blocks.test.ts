import type { Element } from 'hast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';

import { mdxish } from '../../../lib';
import { collectNodes, findAllElementsByTagName, findElementByTagName, parseMdxishWithSource } from '../../helpers';

function ensureJsxTableIsParsed(md: string) {
  const { tree: mdastTree } = parseMdxishWithSource(md);
  // A table containing an <HTMLBlock> carries block-level content, so it is kept
  // as a JSX <Table> (mdxJsxFlowElement) rather than collapsed to a markdown table.
  const tableNodes = collectNodes(
    mdastTree,
    node => node.type === 'mdxJsxFlowElement' && (node as MdxJsxFlowElement).name === 'Table',
  );
  expect(tableNodes).toHaveLength(1);
}

/** Decoded `html` props of every <html-block> in the rendered tree, in document order. */
function htmlBlockPayloads(tree: ReturnType<typeof mdxish>) {
  return findAllElementsByTagName(tree, 'html-block').map(node => node.properties?.html);
}

/** Asserts no raw <HTMLBlock> survived and no protected marker leaked into the tree. */
function expectFullyConverted(tree: ReturnType<typeof mdxish>) {
  expect(findElementByTagName(tree, 'HTMLBlock')).toBeNull();
  expect(JSON.stringify(tree)).not.toContain('RDMX_HTMLBLOCK');
}

describe('<HTMLBlock> parsing', () => {
  describe('standalone', () => {
    it('renders as <html-block> with the decoded html prop', () => {
      const tree = mdxish('<HTMLBlock>{`<div style="color: red;">Hello</div>`}</HTMLBlock>');

      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        type: 'element',
        tagName: 'html-block',
        properties: { html: '<div style="color: red;">Hello</div>' },
        children: [],
      });
    });

    it('renders between surrounding paragraphs', () => {
      const tree = mdxish('text before\n\n<HTMLBlock>{`<div>x</div>`}</HTMLBlock>\n\ntext after');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<div>x</div>']);
      const json = JSON.stringify(tree);
      expect(json).toContain('text before');
      expect(json).toContain('text after');
    });

    it('renders after a markdown heading', () => {
      const tree = mdxish('# Heading\n\n<HTMLBlock>{`<p>after heading</p>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<p>after heading</p>']);
      expect(findElementByTagName(tree, 'h1')).not.toBeNull();
    });

    it('renders two consecutive top-level HTMLBlocks', () => {
      const tree = mdxish('<HTMLBlock>{`<div>one</div>`}</HTMLBlock>\n\n<HTMLBlock>{`<div>two</div>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<div>one</div>', '<div>two</div>']);
    });

    it('renders inline within a paragraph alongside text', () => {
      const tree = mdxish('Inline <HTMLBlock>{`<b>x</b>`}</HTMLBlock> text');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<b>x</b>']);
      const json = JSON.stringify(tree);
      expect(json).toContain('Inline');
      expect(json).toContain('text');
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

      const tree = mdxish(markdown);
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });

      const htmlProp = htmlBlock?.properties?.html as string;
      expect(htmlProp).toContain('<pre><code>');
      expect(htmlProp).toContain('const foo = () => {');
      expect(htmlProp).toContain("baz: 'blammo'");
      expect(htmlProp).toContain('</code></pre>');
    });

    it('handles standalone multiline HTMLBlock with surrounding paragraphs', () => {
      const markdown = `Hello

<HTMLBlock>{\`
<p><strong">Hello</strong>, World!</p>
\`}</HTMLBlock>

there`;
      const tree = mdxish(markdown);
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });
      expect(htmlBlock?.properties?.html).toContain('Hello</strong>, World!</p>');
    });

    it('handles nested HTMLBlock tags in content', () => {
      const tree = mdxish('<HTMLBlock>{`<HTMLBlock>{<strong>Hello</strong>}</HTMLBlock>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({ tagName: 'html-block' });
      expect(htmlBlock?.properties?.html).toContain('<HTMLBlock>{<strong>Hello</strong>}</HTMLBlock>');
    });
  });

  describe('content formatting', () => {
    it('preserves multiline HTML content verbatim', () => {
      const tree = mdxish('<HTMLBlock>{`<div>\n  <span>multi</span>\n</div>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<div>\n  <span>multi</span>\n</div>']);
      expectFullyConverted(tree);
    });

    it('preserves raw <script> content without consuming it as markup', () => {
      const tree = mdxish('<HTMLBlock>{`<script>alert("xss")</script>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<script>alert("xss")</script>']);
      // The script must not become a real <script> element in the tree.
      expect(findElementByTagName(tree, 'script')).toBeNull();
    });

    it('unescapes backticks inside the content', () => {
      const tree = mdxish('<HTMLBlock>{`<code>const x = \\`tpl\\`;</code>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<code>const x = `tpl`;</code>']);
    });

    it('preserves curly braces in the content (not treated as MDX expressions)', () => {
      const tree = mdxish('<HTMLBlock>{`<div>{notTemplate}</div>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<div>{notTemplate}</div>']);
    });

    it('adds newlines for readability', () => {
      const hast = mdxish('<HTMLBlock>{`<p><strong">Hello</strong>, World!</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(hast, 'html-block');
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<p><strong">Hello</strong>, World!</p>' },
      });
    });

    it('unescapes backticks in HTML content', () => {
      const hast = mdxish('<HTMLBlock>{`<code>\\`example\\`</code>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(hast, 'html-block');
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<code>`example`</code>' },
      });
    });

    it('passes safeMode property correctly', () => {
      const hast = mdxish('<HTMLBlock safeMode={true}>{`<script>alert("XSS")</script><p>Content</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(hast, 'html-block');
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { safeMode: 'true', html: '<script>alert("XSS")</script><p>Content</p>' },
      });
    });

    it('handles template literal with variables', () => {
      // eslint-disable-next-line quotes
      const hast = mdxish(`<HTMLBlock>{\`<code>const x = \${variable}</code>\`}</HTMLBlock>`);
      const htmlBlock = findElementByTagName(hast, 'html-block');
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        // eslint-disable-next-line no-template-curly-in-string
        properties: { html: '<code>const x = ${variable}</code>' },
      });
    });

    it('handles nested template literals', () => {
      const hast = mdxish('<HTMLBlock>{`<pre>\\`\\`\\`javascript\\nconst x = 1;\\n\\`\\`\\`</pre>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(hast, 'html-block');
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<pre>```javascript\nconst x = 1;\n```</pre>' },
      });
    });

    it('handles trailing whitespace after closing tag', () => {
      const hast = mdxish('<HTMLBlock>{`<div>hello</div>`}</HTMLBlock>   ');
      const htmlBlock = findElementByTagName(hast, 'html-block');
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '<div>hello</div>' },
      });
    });
  });

  describe('inside generic HTML tags & markdown', () => {
    it('renders inside a <div> with the decoded html prop', () => {
      const tree = mdxish('<div><HTMLBlock>{`<p>nested</p>`}</HTMLBlock></div>');

      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        type: 'element',
        tagName: 'html-block',
        properties: { html: '<p>nested</p>' },
      });
      expect(findElementByTagName(tree, 'div')).not.toBeNull();
    });

    it('renders inside a <section> separated by blank lines', () => {
      const tree = mdxish('<section>\n\n<HTMLBlock>{`<p>n</p>`}</HTMLBlock>\n\n</section>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<p>n</p>']);
      expect(findElementByTagName(tree, 'section')).not.toBeNull();
    });

    it('renders inside a blockquote', () => {
      const tree = mdxish('> <HTMLBlock>{`<p>n</p>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<p>n</p>']);
      expect(findElementByTagName(tree, 'blockquote')).not.toBeNull();
    });

    it('renders inside a list item', () => {
      const tree = mdxish('- <HTMLBlock>{`<p>n</p>`}</HTMLBlock>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<p>n</p>']);
      expect(findElementByTagName(tree, 'li')).not.toBeNull();
    });

    it('renders inside callout blockquotes', () => {
      const md = `> 🚧 It compiles!
>
> <HTMLBlock>{\`
>   <strong style="color: olive">Hello, World!</strong>
> \`}</HTMLBlock>`;

      const tree = mdxish(md);
      const callout = tree.children[0] as Element;

      expect(callout.tagName).toBe('Callout');

      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        tagName: 'html-block',
        properties: { html: '  <strong style="color: olive">Hello, World!</strong>' },
      });
    });

    it('does not render inside code blocks', () => {
      const md = '```<HTMLBlock>{`<p>n</p>`}</HTMLBlock>```';

      const tree = mdxish(md);
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toBeNull();
    });
  });

  describe('inside ReadMe components', () => {
    describe('callouts', () => {
      it('handles HTMLBlock in an empty callout (no title text)', () => {
        const markdown = `> 📘
>
> <HTMLBlock>{\`<p>body only</p>\`}</HTMLBlock>`;

        const hast = mdxish(markdown);
        expect((hast.children[0] as Element).tagName).toBe('Callout');

        const htmlBlock = findElementByTagName(hast, 'html-block');
        expect(htmlBlock).toMatchObject({
          tagName: 'html-block',
          properties: { html: '<p>body only</p>' },
        });
      });

      it('renders inside a <Callout>', () => {
        const tree = mdxish(
          '<Callout icon="👍" theme="okay">\n\n<HTMLBlock>{`<div>\n  <p>n</p>\n\n  <p>m</p>\n</div>`}</HTMLBlock>\n\n</Callout>',
        );

        expect(htmlBlockPayloads(tree)).toStrictEqual(['<div>\n  <p>n</p>\n\n  <p>m</p>\n</div>']);
        expectFullyConverted(tree);
      });
    });

    it('renders inside an <Accordion>', () => {
      const tree = mdxish('<Accordion title="t">\n\n<HTMLBlock>{`<p>n</p>`}</HTMLBlock>\n\n</Accordion>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<p>n</p>']);
      expectFullyConverted(tree);
    });

    it('renders inside <Columns>/<Column>', () => {
      const tree = mdxish('<Columns>\n<Column>\n\n<HTMLBlock>{`<p>n</p>`}</HTMLBlock>\n\n</Column>\n</Columns>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<p>n</p>']);
      expectFullyConverted(tree);
    });

    it('renders inside <Tabs>/<Tab>', () => {
      const tree = mdxish('<Tabs>\n<Tab title="a">\n\n<HTMLBlock>{`<p>n</p>`}</HTMLBlock>\n\n</Tab>\n</Tabs>');

      expect(htmlBlockPayloads(tree)).toStrictEqual(['<p>n</p>']);
      expectFullyConverted(tree);
    });
  });

  describe('inside <Table>', () => {
    it('renders inside a <Table> cell as <html-block> with the decoded html prop', () => {
      const md = `<Table>
  <thead>
    <tr><th>Name</th><th>Markup</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Custom</td>
      <td><HTMLBlock>{\`<div style="color: red;">
  <p>Hello</p>

  <p>World</p>
</div>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);

      const tree = mdxish(md);

      const rawHtmlBlock = findElementByTagName(tree, 'HTMLBlock');
      expect(rawHtmlBlock).toBeNull();

      // Newlines (including the blank line) inside the content must survive the
      // table re-parse and not fragment the HTMLBlock.
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        type: 'element',
        tagName: 'html-block',
        properties: { html: '<div style="color: red;">\n  <p>Hello</p>\n\n  <p>World</p>\n</div>' },
        children: [],
      });
    });

    it('still renders markdown in a sibling text cell', () => {
      const md = `<Table>
  <thead>
    <tr><th>A</th><th>B</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>**bold** here</td>
      <td><HTMLBlock>{\`<ul>
  <li>one</li>

  <li>two</li>
</ul>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);

      const tree = mdxish(md);
      // The sibling cell's markdown must still be processed into a <strong>.
      const strongs = findAllElementsByTagName(tree, 'strong');
      expect(strongs.length).toBeGreaterThan(0);
      expect(JSON.stringify(strongs[0])).toContain('bold');
      expect(htmlBlockPayloads(tree)).toStrictEqual(['<ul>\n  <li>one</li>\n\n  <li>two</li>\n</ul>']);
    });

    it('renders inside a lowercase <table> cell', () => {
      const md = `<table>
  <tbody>
    <tr>
      <td><HTMLBlock>{\`<section>
  <p>a</p>

  <p>b</p>
</section>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</table>`;

      const tree = mdxish(md);
      expect(htmlBlockPayloads(tree)).toStrictEqual(['<section>\n  <p>a</p>\n\n  <p>b</p>\n</section>']);
      expectFullyConverted(tree);
    });

    it('preserves curly braces in HTMLBlock content inside a table cell', () => {
      const md = `<Table>
  <tbody>
    <tr>
      <td><HTMLBlock>{\`<div>{notTemplate}</div>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);
      const tree = mdxish(md);
      expect(htmlBlockPayloads(tree)).toStrictEqual(['<div>{notTemplate}</div>']);
    });

    it('preserves safeMode and runScripts attributes when nested', () => {
      const md = `<Table>
  <tbody>
    <tr>
      <td><HTMLBlock safeMode="true" runScripts="false">{\`<div>raw</div>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);

      const tree = mdxish(md);
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        type: 'element',
        tagName: 'html-block',
        properties: {
          html: '<div>raw</div>',
          safeMode: 'true',
          runScripts: false,
        },
      });
    });

    it('renders multiple HTMLBlocks inside the same Table', () => {
      const md = `<Table>
  <tbody>
    <tr>
      <td><HTMLBlock>{\`<div>
  <span>one</span>

  <span>uno</span>
</div>\`}</HTMLBlock></td>
      <td><HTMLBlock>{\`<span>two</span>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);

      const tree = mdxish(md);

      const htmlBlocks = findAllElementsByTagName(tree, 'html-block');
      expect(htmlBlocks).toHaveLength(2);
      expect(htmlBlocks[0].properties).toMatchObject({
        html: '<div>\n  <span>one</span>\n\n  <span>uno</span>\n</div>',
      });
      expect(htmlBlocks[1].properties).toMatchObject({ html: '<span>two</span>' });
    });

    it('leaves no RDMX_HTMLBLOCK markers or stray comment nodes in the tree', () => {
      const md = `<Table>
  <tbody>
    <tr>
      <td>
        <HTMLBlock>{\`<div>x</div>\`}</HTMLBlock>
      </td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);

      const tree = mdxish(md);
      const serialized = JSON.stringify(tree);

      expect(serialized).not.toContain('RDMX_HTMLBLOCK');

      const htmlBlock = findElementByTagName(tree, 'html-block') as Element;
      expect(htmlBlock.children).toStrictEqual([]);
    });
  });
});
