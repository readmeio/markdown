import { mdxish } from '../../lib';
import { findElementByTagName } from '../helpers';

describe('mdxish html blocks transformer', () => {
  describe('attribute extraction', () => {
    it('extracts safeMode from JSX syntax', () => {
      const tree = mdxish('<HTMLBlock safeMode={true}>{`<p>content</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<p>content</p>', safeMode: 'true' },
      });
    });

    it('extracts safeMode from string syntax', () => {
      const tree = mdxish('<HTMLBlock safeMode="false">{`<p>content</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<p>content</p>', safeMode: 'false' },
      });
    });

    it('extracts runScripts boolean true', () => {
      const tree = mdxish('<HTMLBlock runScripts="true">{`<p>content</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<p>content</p>', runScripts: true },
      });
    });

    it('extracts runScripts boolean false', () => {
      const tree = mdxish('<HTMLBlock runScripts="false">{`<p>content</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<p>content</p>', runScripts: false },
      });
    });

    it('extracts runScripts string value', () => {
      const tree = mdxish('<HTMLBlock runScripts="afterRender">{`<p>content</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<p>content</p>', runScripts: 'afterRender' },
      });
    });

    it('extracts multiple attributes', () => {
      const tree = mdxish(
        '<HTMLBlock safeMode={true} runScripts="true">{`<p>content</p>`}</HTMLBlock>',
      );
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<p>content</p>', safeMode: 'true', runScripts: true },
      });
    });

    it('omits runScripts and safeMode when absent', () => {
      const tree = mdxish('<HTMLBlock>{`<p>content</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<p>content</p>' },
      });
    });
  });

  describe('content extraction', () => {
    it('strips template literal delimiters', () => {
      const tree = mdxish('<HTMLBlock>{`<div>hello</div>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<div>hello</div>' },
      });
    });

    it('handles content without template literal syntax', () => {
      const tree = mdxish('<HTMLBlock>{`<em>plain</em>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<em>plain</em>' },
      });
    });

    it('unescapes backticks in HTML content', () => {
      const tree = mdxish('<HTMLBlock>{`<code>\\`example\\`</code>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<code>`example`</code>' },
      });
    });

    it('preserves multiline content', () => {
      const markdown = `<HTMLBlock>{\`
<ul>
  <li>one</li>
  <li>two</li>
</ul>
\`}</HTMLBlock>`;
      const tree = mdxish(markdown);
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: '<ul>\n  <li>one</li>\n  <li>two</li>\n</ul>' },
      });
    });

    it('starts indent relative to the HTMLBlock opening tag', () => {
      const markdown = `
  <HTMLBlock>{\`first
second
   third
  fourth
  \`}</HTMLBlock>`;
      const tree = mdxish(markdown);
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        properties: { html: 'first\nsecond\n third\nfourth' },
      });
    });
  });

  describe('node structure', () => {
    it('produces correct node type and hName', () => {
      const tree = mdxish('<HTMLBlock>{`<p>test</p>`}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        type: 'element',
        tagName: 'html-block',
      });
    });

    it('does not transform non-HTMLBlock html nodes', () => {
      const tree = mdxish('<div>just html</div>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toBeNull();
    });
  });
})