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

      // Find the table element
      const element = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;

      expect(element).toBeDefined();
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[0] as Element).tagName).toBe('thead');
      expect((element.children[1] as Element).tagName).toBe('tbody');
    });

    it('should convert html content inside table cells as nodes in the ast', () => {
      const md = `[block:parameters]
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

      // Find the table element
      const element = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;
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
      const md = `[block:parameters]
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

      // Find the table element
      const element = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;

      expect(element).toBeDefined();
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

    it('should preserve multiple paragraphs with links in table cells', () => {
      const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Feature',
      'h-1': 'Description',
      '0-0':
        '**Webhooks**  \nProfile activity event delivery service to your listener endpoint. Configured via API: you provide the endpoint and then consume webhook notifications.  \n  \n[Introduction to Webhooks v3](doc:an-introduction-to-webhooks-v3-1)',
      '0-1': 'Available',
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

      // Find the table element
      const element = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;

      expect(element).toBeDefined();
      expect(element.tagName).toBe('table');

      const tbody = element.children[1] as Element;
      const row = tbody.children[0] as Element;
      const cell = row.children[0] as Element;

      expect(cell.children.length).toBeGreaterThan(1);
      expect(cell.children[0].type).toBe('element');
      expect((cell.children[0] as Element).tagName).toBe('p');

      const lastParagraph = cell.children[cell.children.length - 1] as Element;
      expect(lastParagraph.tagName).toBe('p');
      expect((lastParagraph.children[0] as Element).tagName).toBe('a');
      expect((lastParagraph.children[0] as Element).properties.href).toBe('doc:an-introduction-to-webhooks-v3-1');
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

  describe('embed block', () => {
    it('should restore embed block', () => {
      const md = `[block:embed]
{
  "url": "https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4",
  "provider": "youtube.com",
  "href": "https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4",
  "typeOfEmbed": "youtube"
}
[/block]`;

      const ast = mdxish(md);

      // Embed is a block-level element, so it should be lifted to root level
      const embedElement = ast.children[0] as Element;

      expect(embedElement.type).toBe('element');
      expect(embedElement.tagName).toBe('embed');
      expect(embedElement.properties.url).toBe(
        'https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4',
      );
      expect(embedElement.properties.provider).toBe('youtube.com');
      expect(embedElement.properties.href).toBe(
        'https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4',
      );
      expect(embedElement.properties.typeOfEmbed).toBe('youtube');
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

    it('should convert html content inside callout title and body as nodes in the ast', () => {
      const md = `[block:callout]
${JSON.stringify(
        {
          type: 'info',
          title: '*HTML Title*',
          body: '*Italic body*, **bold text**, `code block`',
        },
        null,
        2,
      )}
[/block]`;

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);

      const calloutElement = ast.children[0] as Element;
      expect(calloutElement.children.length).toBeGreaterThan(0);

      // Title should be italicized
      const titleHeading = calloutElement.children[0] as Element;
      expect(titleHeading.tagName).toBe('h3');
      expect(titleHeading.children.length).toBeGreaterThan(0);
      expect((titleHeading.children[0] as Element).tagName).toBe('em');

      // Body should have parsed markdown
      const bodyParagraph = calloutElement.children[1] as Element;

      // Body can have multiple inline elements (em, strong, code)
      const bodyChildren = bodyParagraph.children as Element[];
      expect(bodyChildren.some(child => child.tagName === 'em')).toBe(true);
      expect(bodyChildren.some(child => child.tagName === 'strong')).toBe(true);
      expect(bodyChildren.some(child => child.tagName === 'code')).toBe(true);
    });
  });
});
