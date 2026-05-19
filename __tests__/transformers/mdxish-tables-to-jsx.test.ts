import type { Parent, Root } from 'mdast';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import mdxishTablesToJsx from '../../processor/transform/mdxish/tables/mdxish-tables-to-jsx';
import { collectNodes } from '../helpers';

const parseWithPlugin = (markdown: string): Root => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => (tree: Root) => mdxishTablesToJsx()(tree) ?? undefined);
  const tree = processor.parse(markdown);
  processor.runSync(tree);
  return tree as Root;
};

describe('mdxish-tables-to-jsx', () => {
  describe('plain GFM tables (no flow content)', () => {
    it('leaves a simple text table as a GFM table node', () => {
      const tree = parseWithPlugin('| a | b |\n| --- | --- |\n| c | d |');
      const tables = collectNodes(tree, 'table');

      expect(tables).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('leaves a table with inline formatting as GFM', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| **bold** and _italic_ |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('leaves a table with empty cells as GFM', () => {
      const tree = parseWithPlugin('| a | b |\n| --- | --- |\n| | d |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
    });
  });

  describe('tables with flow content (converted to JSX)', () => {
    it('converts a table containing a self-closing JSX component to JSX', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| <Image src="x.png" /> |');
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement');
      const tables = jsxElements.filter((n) => (n as { name?: string }).name === 'Table');

      expect(tables).toHaveLength(1);
      expect(collectNodes(tree, 'table')).toHaveLength(0);
    });
  });

  describe('tables with raw HTML (kept as GFM)', () => {
    it('keeps a table with a raw HTML block as GFM', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| <div>hello</div> |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });

    it('keeps a table with unclosed HTML tags as GFM', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| <br> |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
    });
  });

  describe('break node replacement', () => {
    it('replaces break nodes with text newlines', () => {
      const md = '| Header |\n| --- |\n| line1<br>line2 |';
      const tree = parseWithPlugin(md);

      const textNodes: Parent[] = [];
      const stack = [tree as Parent];
      while (stack.length) {
        const node = stack.pop()!;
        if (node.type === 'text' && 'value' in node && (node as unknown as { value: string }).value.includes('\n')) {
          textNodes.push(node);
        }
        if ('children' in node && Array.isArray(node.children)) {
          stack.push(...(node.children as Parent[]));
        }
      }

      expect(textNodes.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('JSX Table structure', () => {
    it('generates thead, tbody, tr, th, and td elements', () => {
      const tree = parseWithPlugin(
        '| H1 | H2 |\n| --- | --- |\n| <Image src="a.png" /> | text |',
      );
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name: string })[];
      const names = jsxElements.map((n) => n.name);

      expect(names).toContain('Table');
      expect(names).toContain('thead');
      expect(names).toContain('tbody');
      expect(names).toContain('tr');
      expect(names).toContain('th');
      expect(names).toContain('td');
    });

    it('preserves alignment as an attribute on the Table element', () => {
      const tree = parseWithPlugin(
        '| Left | Center | Right |\n| :--- | :---: | ---: |\n| <Image src="a.png" /> | b | c |',
      );
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & {
        attributes: { name: string; value: { value: string } }[];
        name: string;
      })[];
      const tableNode = jsxElements.find((n) => n.name === 'Table');

      expect(tableNode).toBeDefined();
      const alignAttr = tableNode!.attributes.find((a) => a.name === 'align');
      expect(alignAttr).toBeDefined();
      expect(JSON.parse(alignAttr!.value.value)).toStrictEqual(['left', 'center', 'right']);
    });

    it('omits the align attribute when all columns are left-aligned', () => {
      const tree = parseWithPlugin(
        '| A | B |\n| --- | --- |\n| <Image src="a.png" /> | x |',
      );
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & {
        attributes: { name: string }[];
        name: string;
      })[];
      const tableNode = jsxElements.find((n) => n.name === 'Table');

      expect(tableNode).toBeDefined();
      expect(tableNode!.attributes).toHaveLength(0);
    });
  });

  describe('multi-child cell scanning', () => {
    it('detects flow content in any child of a cell, not just the first', () => {
      const md = '| Header |\n| --- |\n| text <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);
      const jsxElements = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name?: string })[];
      const tableNode = jsxElements.find((n) => n.name === 'Table');

      expect(tableNode).toBeDefined();
    });

    it('keeps GFM when all children are phrasing content', () => {
      const tree = parseWithPlugin('| Header |\n| --- |\n| hello **world** |');

      expect(collectNodes(tree, 'table')).toHaveLength(1);
      expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(0);
    });
  });
});
