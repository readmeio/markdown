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

describe('<HTMLBlock> in mdxish', () => {
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
  });

  it('renders inside a generic JSX block as <html-block> with the decoded html prop', () => {
    const md = '<div><HTMLBlock>{`<p>nested</p>`}</HTMLBlock></div>';

    const tree = mdxish(md);

    const htmlBlock = findElementByTagName(tree, 'html-block');
    expect(htmlBlock).toMatchObject({
      type: 'element',
      tagName: 'html-block',
      properties: { html: '<p>nested</p>' },
    });
  });

  describe('inside <Table> cells', () => {
    it('renders inside a <Table> cell as <html-block> with the decoded html prop', () => {
      const md = `<Table>
  <thead>
    <tr><th>Name</th><th>Markup</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Custom</td>
      <td><HTMLBlock>{\`<div style="color: red;">Hello</div>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);

      const tree = mdxish(md);

      const rawHtmlBlock = findElementByTagName(tree, 'HTMLBlock');
      expect(rawHtmlBlock).toBeNull();

      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(htmlBlock).toMatchObject({
        type: 'element',
        tagName: 'html-block',
        properties: { html: '<div style="color: red;">Hello</div>' },
        children: [],
      });
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
          runScripts: 'false',
        },
      });
    });

    it('renders multiple HTMLBlocks inside the same Table', () => {
      const md = `<Table>
  <tbody>
    <tr>
      <td><HTMLBlock>{\`<span>one</span>\`}</HTMLBlock></td>
      <td><HTMLBlock>{\`<span>two</span>\`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>`;

      ensureJsxTableIsParsed(md);

      const tree = mdxish(md);

      const htmlBlocks = findAllElementsByTagName(tree, 'html-block');
      expect(htmlBlocks).toHaveLength(2);
      expect(htmlBlocks[0].properties).toMatchObject({ html: '<span>one</span>' });
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
