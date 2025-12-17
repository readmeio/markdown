import type { Element } from 'hast';

import { mdxish } from '../../../lib';

describe('mdxish magic blocks', () => {
  describe('image block', () => {
    it('should restore image block', () => {
      const md = `[block:image]
{
"images": [
  {
    "image": [
      "https://files.readme.io/327e65d-image.png",
      null,
      null
    ],
    "align": "left",
    "sizing": "50%"
  }
]
}
[/block]`;

      const ast = mdxish(md);
      const imgElement = ast.children[0] as Element;
      expect(imgElement.tagName).toBe('img');
      expect(imgElement.properties.src).toBe('https://files.readme.io/327e65d-image.png');
      expect(imgElement.properties.alt).toBe('');
      expect(imgElement.properties.align).toBe('left');
      expect(imgElement.properties.width).toBe('50%');
    });
  });

  describe('table block', () => {
    it('should restore parameters block to tables', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Term',
      'h-1': 'Definition',
      '0-0': 'Events',
      '0-1': 'Pseudo-list:  \n● One  \n● Two',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);
      // Some extra children are added to the AST by the mdxish wrapper
      const element = ast.children[2] as Element;
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[0] as Element).tagName).toBe('thead');
      expect((element.children[1] as Element).tagName).toBe('tbody');
    });
  });

  describe('parameters block', () => {
    it('should parse <br> elements in parameters block cell data', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Header 1',
      'h-1': 'Header 2',
      '0-0': 'Line 1<br>Line 2',
      '0-1': 'Text<br>More text',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);
      const table = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;
      const tbody = table.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tbody',
      ) as Element;
      const row = tbody.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tr',
      ) as Element;
      const cells = row.children.filter(
        child => child.type === 'element' && (child as Element).tagName === 'td',
      ) as Element[];

      const firstCell = cells[0];
      const brElement = firstCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'br',
      ) as Element;
      expect(brElement.tagName).toBe('br');

      const textNodes = firstCell.children.filter(child => child.type === 'text');
      const textValues = textNodes.map(node => (node as { value: string }).value).join('');
      expect(textValues).toContain('Line 1');
      expect(textValues).toContain('Line 2');
    });

    it('should parse <span> elements in parameters block cell data', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Header 1',
      'h-1': 'Header 2',
      '0-0': '<span>Hello World</span>',
      '0-1': 'Text with <span>inline span</span> content',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);
      const table = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;
      const tbody = table.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tbody',
      ) as Element;
      const row = tbody.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tr',
      ) as Element;
      const cells = row.children.filter(
        child => child.type === 'element' && (child as Element).tagName === 'td',
      ) as Element[];

      const firstCell = cells[0];
      const spanElement = firstCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'span',
      ) as Element;
      expect(spanElement.tagName).toBe('span');
      expect((spanElement.children.find(child => child.type === 'text') as { value: string }).value).toBe(
        'Hello World',
      );

      const secondCell = cells[1];
      const secondCellSpan = secondCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'span',
      ) as Element;
      expect(secondCellSpan.tagName).toBe('span');
      expect((secondCellSpan.children.find(child => child.type === 'text') as { value: string }).value).toBe(
        'inline span',
      );

      const secondCellText = secondCell.children
        .filter(child => child.type === 'text')
        .map(node => (node as { value: string }).value)
        .join('');
      expect(secondCellText).toContain('Text with');
      expect(secondCellText).toContain('content');
    });

    it('should parse mixed HTML elements (<br> and <span>) in parameters block cell data', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Header',
      '0-0': '<br>  \n  \n<span>Hello</span>',
    },
    cols: 1,
    rows: 1,
    align: ['left'],
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);
      const table = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;
      const tbody = table.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tbody',
      ) as Element;
      const row = tbody.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tr',
      ) as Element;
      const cell = row.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'td',
      ) as Element;

      const brElement = cell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'br',
      ) as Element;
      expect(brElement.tagName).toBe('br');

      const spanElement = cell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'span',
      ) as Element;
      expect(spanElement.tagName).toBe('span');
      expect((spanElement.children.find(child => child.type === 'text') as { value: string }).value).toBe('Hello');
    });

    it('should parse complex HTML structure in parameters block cell data', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Hello',
      'h-1': 'World',
      '0-0': 'First line<br><span>Hello</span><br>Last line',
      '0-1': 'Text with <span>inline span</span> and <br> break',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);
      const table = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;
      const tbody = table.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tbody',
      ) as Element;
      const row = tbody.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'tr',
      ) as Element;
      const cells = row.children.filter(
        child => child.type === 'element' && (child as Element).tagName === 'td',
      ) as Element[];

      const firstCell = cells[0];
      const brElements = firstCell.children.filter(
        child => child.type === 'element' && (child as Element).tagName === 'br',
      ) as Element[];
      expect(brElements.length).toBeGreaterThanOrEqual(2);

      const spanElement = firstCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'span',
      ) as Element;
      expect(spanElement.tagName).toBe('span');
      expect((spanElement.children.find(child => child.type === 'text') as { value: string }).value).toBe('Hello');

      const allText = firstCell.children
        .filter(child => child.type === 'text')
        .map(node => (node as { value: string }).value)
        .join('');
      expect(allText).toContain('First line');
      expect(allText).toContain('Last line');

      const secondCell = cells[1];
      const secondCellSpan = secondCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'span',
      ) as Element;
      expect(secondCellSpan.tagName).toBe('span');

      const secondCellBr = secondCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'br',
      ) as Element;
      expect(secondCellBr.tagName).toBe('br');
    });
  });
});
