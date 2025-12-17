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

      // Find the table element (flow elements are now properly unwrapped from paragraphs)
      const tableElement = ast.children.find(
        c => c.type === 'element' && (c as Element).tagName === 'table',
      ) as Element;
      expect(tableElement).toBeDefined();

      const element = tableElement;
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[0] as Element).tagName).toBe('thead');
      expect((element.children[1] as Element).tagName).toBe('tbody');
    });
  });

  describe('recipe block', () => {
    it('should restore tutorial-tile block to Recipe component', () => {
      const md = `[block:tutorial-tile]
{
  "emoji": "🦉",
  "slug": "whoaaa",
  "title": "WHOAAA"
}
[/block]`;

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('element');

      const recipeElement = ast.children[0] as Element;
      expect(recipeElement.tagName).toBe('Recipe');
      expect(recipeElement.properties.slug).toBe('whoaaa');
      expect(recipeElement.properties.title).toBe('WHOAAA');
    });

    it('should restore recipe block to Recipe component', () => {
      const md = `[block:recipe]
{
  "slug": "test-recipe",
  "title": "Test Recipe",
  "emoji": "👉"
}
[/block]`;

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('element');

      const recipeElement = ast.children[0] as Element;
      expect(recipeElement.tagName).toBe('Recipe');
      expect(recipeElement.properties.slug).toBe('test-recipe');
      expect(recipeElement.properties.title).toBe('Test Recipe');
    });
  });

  describe('general tests', () => {
    it('should restore image block inside a list item', () => {
      const md = `- First item
- [block:image]{"images":[{"image":["https://example.com/img.png",null,null]}]}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const imageElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'img');

      expect(imageElement).toBeDefined();
      expect(imageElement!.tagName).toBe('img');
      expect(imageElement!.properties.src).toBe('https://example.com/img.png');
    });

    it('should restore code block inside a list item', () => {
      const md = `- First item
- [block:code]{"codes":[{"code":"const x = 1;","language":"javascript"}]}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const codeElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'CodeTabs');

      expect(codeElement).toBeDefined();
      expect(codeElement!.tagName).toBe('CodeTabs');
    });

    it('should restore api-header block inside a list item', () => {
      const md = `- First item
- [block:api-header]{"title":"API Endpoint","level":2}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const headingElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(c.tagName));

      expect(headingElement).toBeDefined();
      expect(headingElement!.tagName).toBe('h2');
    });

    it('should restore callout block inside a list item', () => {
      const md = `- First item
- [block:callout]{"type":"info","title":"Note","body":"This is important"}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const calloutElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'Callout');

      expect(calloutElement).toBeDefined();
      // rehypeMdxishComponents maps rdme-callout -> Callout
      expect(calloutElement!.tagName).toBe('Callout');
    });

    it('should restore parameters block inside a list item', () => {
      const md = `- First item
- [block:parameters]{"data":{"h-0":"Name","h-1":"Type","0-0":"id","0-1":"string"},"cols":2,"rows":1}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const tableElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'table');

      expect(tableElement).toBeDefined();
      expect(tableElement!.tagName).toBe('table');
    });

    // TODO: unskip this test once embed magic blocks are supported
    // see this PR: https://github.com/readmeio/markdown/pull/1258
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip('should restore embed block inside a list item', () => {
      const md = `- First item
- [block:embed]{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","title":"Video"}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const embedElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'rdme-embed');

      expect(embedElement).toBeDefined();
      expect(embedElement!.tagName).toBe('rdme-embed');
    });

    it('should restore html block inside a list item', () => {
      const md = `- First item
- [block:html]{"html":"<div>Hello World</div>"}[/block]`;

      const ast = mdxish(md);
      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const htmlElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'HTMLBlock');

      expect(htmlElement).toBeDefined();
      expect(htmlElement!.tagName).toBe('HTMLBlock');
    });

    it('should restore recipe block inside a list item', () => {
      const md = `- open
- [block:tutorial-tile]{"emoji":"🦉","slug":"whoaaa","title":"WHOAAA"}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const recipeElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'Recipe');

      expect(recipeElement).toBeDefined();
      expect(recipeElement!.tagName).toBe('Recipe');
      expect(recipeElement!.properties.slug).toBe('whoaaa');
      expect(recipeElement!.properties.title).toBe('WHOAAA');
    });

    it('should restore recipe block (recipe type) inside a list item', () => {
      const md = `- open
- [block:recipe]{"emoji":"👉","slug":"test-recipe","title":"Test Recipe"}[/block]`;

      const ast = mdxish(md);

      const listElement = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'ul') as Element;
      expect(listElement).toBeDefined();

      const recipeElement = listElement.children
        .filter((li): li is Element => li.type === 'element')
        .flatMap((li: Element) => li.children || [])
        .find((c): c is Element => c.type === 'element' && c.tagName === 'Recipe');

      expect(recipeElement).toBeDefined();
      expect(recipeElement!.tagName).toBe('Recipe');
      expect(recipeElement!.properties.slug).toBe('test-recipe');
      expect(recipeElement!.properties.title).toBe('Test Recipe');
    });
  });
});
