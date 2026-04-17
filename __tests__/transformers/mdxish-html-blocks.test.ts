import type { Root } from 'mdast';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

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
