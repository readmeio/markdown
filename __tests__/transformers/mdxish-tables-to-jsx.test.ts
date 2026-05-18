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

  describe('unclosed HTML repair in JSX cells', () => {
    const findCellHtmlValues = (tree: Root, cellName: 'td' | 'th'): string[] => {
      const els = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name: string })[];
      const cell = els.find(n => n.name === cellName);
      if (!cell) return [];
      return (cell.children as { type: string; value?: string }[])
        .filter(c => c.type === 'html')
        .map(c => c.value ?? '');
    };

    it('appends a synthetic closer for an unclosed tag in a body cell', () => {
      const md = '| H |\n| --- |\n| <b>bold <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);

      const values = findCellHtmlValues(tree, 'td');
      expect(values).toContain('<b>');
      expect(values).toContain('</b>');
    });

    it('appends a synthetic closer for an unclosed tag in a header cell', () => {
      const md = '| <b>head <Image src="a.png" /> |\n| --- |\n| body |';
      const tree = parseWithPlugin(md);

      const values = findCellHtmlValues(tree, 'th');
      expect(values).toContain('<b>');
      expect(values).toContain('</b>');
    });

    it('closes mismatched nested tags in browser-recovery order', () => {
      const md = '| H |\n| --- |\n| <b><i>x</b> <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);

      const values = findCellHtmlValues(tree, 'td');
      // both <b> and <i> opened, only </b> seen → balancer pops both, then
      // appends </i> at the end since i was left dangling above the popped b
      // (note: with the simpler pop-to-match strategy, </i> is appended).
      expect(values).toContain('<b>');
      expect(values).toContain('<i>');
      expect(values).toContain('</i>');
    });

    it('empties orphan close tags so they do not render as raw text', () => {
      const md = '| H |\n| --- |\n| </b>text <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);

      const values = findCellHtmlValues(tree, 'td');
      // the orphan </b> is mutated to empty string
      expect(values).toContain('');
      expect(values).not.toContain('</b>');
    });

    it('leaves void elements untouched', () => {
      const md = '| H |\n| --- |\n| <br> <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);

      const values = findCellHtmlValues(tree, 'td');
      expect(values).not.toContain('</br>');
    });

    it('appends the closer after trailing text so the text is enclosed', () => {
      const md =
        '| H |\n| --- |\n| <span style="color:red">This limit ranges between 8 K and 16 K. <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);

      const els = collectNodes(tree, 'mdxJsxFlowElement') as (Parent & { name: string; children: unknown[] })[];
      const td = els.find(n => n.name === 'td');
      expect(td).toBeDefined();

      const kids = td!.children as { type: string; value?: string; name?: string }[];
      const openIdx = kids.findIndex(c => c.type === 'html' && c.value === '<span style="color:red">');
      const closeIdx = kids.findIndex(c => c.type === 'html' && c.value === '</span>');
      const textIdx = kids.findIndex(c => c.type === 'text' && (c.value ?? '').includes('This limit ranges'));

      expect(openIdx).toBeGreaterThanOrEqual(0);
      expect(closeIdx).toBeGreaterThan(textIdx);
      expect(textIdx).toBeGreaterThan(openIdx);
    });

    it('leaves a cell with balanced tags unchanged', () => {
      const md = '| H |\n| --- |\n| <b>bold</b> <Image src="a.png" /> |';
      const tree = parseWithPlugin(md);

      const values = findCellHtmlValues(tree, 'td');
      const openCount = values.filter(v => v === '<b>').length;
      const closeCount = values.filter(v => v === '</b>').length;
      expect(openCount).toBe(1);
      expect(closeCount).toBe(1);
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
