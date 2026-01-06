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
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('element');

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
      expect(ast.children).toHaveLength(4);
      expect(ast.children[2].type).toBe('element');

      const element = ast.children[2] as Element;
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[0] as Element).tagName).toBe('thead');
      expect((element.children[1] as Element).tagName).toBe('tbody');
    });

    it('should convert html content inside table cells as nodes in the ast', () => {
      const md = `
  [block:parameters]
  ${JSON.stringify(
    {
      data: {
        'h-0': 'Header 0',
        'h-1': 'Header 1',
        '0-0': '<h1>this should be a h1 element node</h1>',
        '0-1': '<strong>this should be a strong element node</strong>',
      },
      cols: 2,
      rows: 1,
    },
    null,
    2,
  )}
  [/block]`;

      const ast = mdxish(md);
      // Some extra children are added to the AST by the mdxish wrapper
      expect(ast.children).toHaveLength(4);

      // Table is the 3rd child
      const element = ast.children[2] as Element;
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[1] as Element).tagName).toBe('tbody');

      // Check that HTML in cells is parsed as element nodes
      const tbody = element.children[1] as Element;
      const row = tbody.children[0] as Element;
      const cell0 = row.children[0] as Element;
      const cell1 = row.children[1] as Element;

      expect((cell0.children[0] as Element).tagName).toBe('h1');
      expect((cell1.children[0] as Element).tagName).toBe('strong');
    });

    it('should restore markdown content inside table cells', () => {
      const md = `
  [block:parameters]
  ${JSON.stringify(
    {
      data: {
        'h-0': 'Header 0',
        'h-1': 'Header 1',
        '0-0': '**Bold**',
        '0-1': '*Italic*',
      },
      cols: 2,
      rows: 1,
    },
    null,
    2,
  )}
  [/block]`;

      const ast = mdxish(md);
      // Some extra children are added to the AST by the mdxish wrapper
      expect(ast.children).toHaveLength(4);

      // Table is the 3rd child
      const element = ast.children[2] as Element;
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[1] as Element).tagName).toBe('tbody');

      const tbody = element.children[1] as Element;
      const row = tbody.children[0] as Element;
      const cell0 = row.children[0] as Element;
      const cell1 = row.children[1] as Element;

      expect((cell0.children[0] as Element).tagName).toBe('strong');
      expect((cell1.children[0] as Element).tagName).toBe('em');
    });
  });

  describe('code block', () => {
    it('should create code-tabs for multiple code blocks', () => {
      const md = `[block:code]
  {
    "codes": [
      {
        "code": "echo 'Hello World'",
        "language": "bash"
      },
      {
        "code": "print('Hello World')",
        "language": "python"
      }
    ]
  }
  [/block]`;

      const ast = mdxish(md);

      // Find the code-tabs element
      const codeTabsElement = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'CodeTabs',
      ) as Element;

      expect(codeTabsElement).toBeDefined();
      expect(codeTabsElement.tagName).toBe('CodeTabs');
    });

    it('should not wrap code-tabs in paragraph tags', () => {
      const md = `Some text before
  
  [block:code]
  {
    "codes": [
      {
        "code": "echo 'Hello World'",
        "language": "bash"
      },
      {
        "code": "print('Hello World')",
        "language": "python"
      }
    ]
  }
  [/block]
  
  Some text after`;

      const ast = mdxish(md);

      // Find the code-tabs element
      const codeTabsElement = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'CodeTabs',
      ) as Element;

      expect(codeTabsElement).toBeDefined();
      expect(codeTabsElement.tagName).toBe('CodeTabs');

      // Verify code-tabs is NOT inside a paragraph
      // Check all paragraph elements to ensure none contain CodeTabs
      const paragraphs = ast.children.filter(
        child => child.type === 'element' && (child as Element).tagName === 'p',
      ) as Element[];

      paragraphs.forEach(paragraph => {
        const hasCodeTabs = paragraph.children.some(
          child => child.type === 'element' && (child as Element).tagName === 'CodeTabs',
        );
        expect(hasCodeTabs).toBe(false);
      });

      // Verify code-tabs is at the root level (not nested in a paragraph)
      expect(ast.children).toContain(codeTabsElement);
    });

    it('should lift code-tabs out of paragraphs when inserted mid-paragraph', () => {
      const md = `Before text [block:code]
  {
    "codes": [
      {
        "code": "echo 'First command'",
        "language": "bash"
      },
      {
        "code": "echo 'Second command'",
        "language": "bash"
      }
    ]
  }
  [/block] after text`;

      const ast = mdxish(md);

      // Find the code-tabs element
      const codeTabsElement = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'CodeTabs',
      ) as Element;

      expect(codeTabsElement).toBeDefined();

      // Verify code-tabs is at root level, not inside a paragraph
      const paragraphs = ast.children.filter(
        child => child.type === 'element' && (child as Element).tagName === 'p',
      ) as Element[];

      paragraphs.forEach(paragraph => {
        const hasCodeTabs = paragraph.children.some(
          child => child.type === 'element' && (child as Element).tagName === 'CodeTabs',
        );
        expect(hasCodeTabs).toBe(false);
      });
    });
  });

  describe('callout block', () => {
    it('should restore callout block', () => {
      const md = '[block:callout]{"type":"info","title":"Note","body":"This is important"}[/block]';

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('element');

      const calloutElement = ast.children[0] as Element;
      expect(calloutElement.tagName).toBe('Callout');
      expect(calloutElement.properties.type).toBe('info');
      expect(calloutElement.properties.theme).toBe('info');
      expect(calloutElement.properties.icon).toBe('📘');
      expect(calloutElement.children).toHaveLength(2);
    });
  });
});
