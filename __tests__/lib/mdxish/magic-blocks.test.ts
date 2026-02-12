import type { Element, Text } from 'hast';

import { toHtml } from 'hast-util-to-html';

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

    it('should parse markdown in image caption', () => {
      const md = `[block:image]
{
"images": [
  {
    "image": [
      "https://files.readme.io/327e65d-image.png",
      null,
      "Alt text"
    ],
    "caption": "This caption has **bold** and *italic* text"
  }
]
}
[/block]`;

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);

      const figure = ast.children[0] as Element;
      expect(figure.tagName).toBe('figure');

      // Find the figcaption
      const figcaption = figure.children.find(child => (child as Element).tagName === 'figcaption') as Element;
      expect(figcaption).toBeDefined();

      // Check that markdown was parsed - should contain strong and em elements
      const paragraph = figcaption.children[0] as Element;
      expect(paragraph.tagName).toBe('p');

      const hasStrong = paragraph.children.some(child => (child as Element).tagName === 'strong');
      const hasEmphasis = paragraph.children.some(child => (child as Element).tagName === 'em');

      expect(hasStrong).toBe(true);
      expect(hasEmphasis).toBe(true);
    });

    it('should parse HTML in image caption', () => {
      const md = `[block:image]
{
"images": [
  {
    "image": [
      "https://files.readme.io/327e65d-image.png",
      null,
      "Alt text"
    ],
    "caption": "<a href=\\"https://example.com\\">Click here</a> for more info"
  }
]
}
[/block]`;

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);

      const figure = ast.children[0] as Element;
      expect(figure.tagName).toBe('figure');

      // Find the figcaption
      const figcaption = figure.children.find(child => (child as Element).tagName === 'figcaption') as Element;
      expect(figcaption).toBeDefined();

      // Check that HTML was parsed - should contain an anchor element
      const paragraph = figcaption.children[0] as Element;
      const hasAnchor = paragraph.children.some(child => (child as Element).tagName === 'a');

      expect(hasAnchor).toBe(true);
    });

    it('should parse markdown links in image caption', () => {
      const md = `[block:image]
{
"images": [
  {
    "image": [
      "https://files.readme.io/327e65d-image.png",
      null,
      "Alt text"
    ],
    "caption": "Check out [this link](https://example.com) for details"
  }
]
}
[/block]`;

      const ast = mdxish(md);

      const figure = ast.children[0] as Element;
      const figcaption = figure.children.find(child => (child as Element).tagName === 'figcaption') as Element;
      const paragraph = figcaption.children[0] as Element;

      const anchor = paragraph.children.find(child => (child as Element).tagName === 'a') as Element;
      expect(anchor).toBeDefined();
      expect(anchor.properties.href).toBe('https://example.com');
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

      // Find the table element dynamically (may have different indices due to whitespace handling)
      const element = ast.children.find((c): c is Element => c.type === 'element' && c.tagName === 'table');
      expect(element).toBeDefined();
      expect(element!.tagName).toBe('table');
      expect(element!.children).toHaveLength(2);
      expect((element!.children[0] as Element).tagName).toBe('thead');
      expect((element!.children[1] as Element).tagName).toBe('tbody');
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

      // Find the table element dynamically
      const element = ast.children.find((c): c is Element => c.type === 'element' && c.tagName === 'table');
      expect(element).toBeDefined();
      expect(element!.tagName).toBe('table');
      expect(element!.children).toHaveLength(2);
      expect((element!.children[1] as Element).tagName).toBe('tbody');

      // Check that HTML in cells is parsed as element nodes
      const tbody = element!.children[1] as Element;
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

      // Find the table element dynamically
      const element = ast.children.find((c): c is Element => c.type === 'element' && c.tagName === 'table');
      expect(element).toBeDefined();
      expect(element!.tagName).toBe('table');
      expect(element!.children).toHaveLength(2);
      expect((element!.children[1] as Element).tagName).toBe('tbody');

      const tbody = element!.children[1] as Element;
      const row = tbody.children[0] as Element;
      const cell0 = row.children[0] as Element;
      const cell1 = row.children[1] as Element;

      expect((cell0.children[0] as Element).tagName).toBe('strong');
      expect((cell1.children[0] as Element).tagName).toBe('em');
    });

    it('should render backticks as code inside HTML elements with newlines', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Name',
      'h-1': 'Description',
      '0-0': '`foo`',
      '0-1':
        'Options: <ul>  \n  \n  <li>`bar`. First option.</li><li>`baz`. Second option.</li>\n</ul> Use `qux` for default.',
    },
    cols: 2,
    rows: 1,
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);

      const element = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;

      expect(element).toBeDefined();

      const tbody = element.children[1] as Element;
      const row = tbody.children[0] as Element;
      const descriptionCell = row.children[1] as Element;

      const findCodeElements = (node: Element): Element[] => {
        const codes: Element[] = [];
        if (node.tagName === 'code') codes.push(node);
        if (node.children) {
          node.children.forEach(child => {
            if (child.type === 'element') {
              codes.push(...findCodeElements(child as Element));
            }
          });
        }
        return codes;
      };

      const codeElements = findCodeElements(descriptionCell);
      const codeTexts = codeElements.map(el => (el.children[0] as { value: string })?.value);

      expect(codeTexts).toContain('bar');
      expect(codeTexts).toContain('baz');
      expect(codeTexts).toContain('qux');
    });

    it('should escape invalid HTML tags and process markdown emphasis inside HTML elements', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Name',
      'h-1': 'Value',
      '0-0': 'foo',
      '0-1': '<ul>\n<li>_\\<placeholder>_.example.com</li>\n</ul>',
    },
    cols: 2,
    rows: 1,
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);

      const table = ast.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'table',
      );
      expect(table).toBeDefined();

      const tbody = table!.children[1] as Element;
      const row = tbody.children[0] as Element;
      const valueCell = row.children[1] as Element;

      const findText = (node: Element | Text): string[] => {
        if ('value' in node) return [node.value as string];
        if ('children' in node) {
          return (node.children as (Element | Text)[]).flatMap(child => findText(child));
        }
        return [];
      };

      const allText = findText(valueCell).join(' ');
      expect(allText).toContain('placeholder');

      const findEm = (node: Element | Text): boolean => {
        if (node.type === 'element' && (node as Element).tagName === 'em') return true;
        if ('children' in node) {
          return (node.children as (Element | Text)[]).some(child => findEm(child));
        }
        return false;
      };
      expect(findEm(valueCell)).toBe(true);
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

      // Find the table element dynamically
      const element = ast.children.find((c): c is Element => c.type === 'element' && c.tagName === 'table');
      expect(element).toBeDefined();
      expect(element!.tagName).toBe('table');

      const tbody = element!.children[1] as Element;
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

    describe('cell preprocessing', () => {
      const createBlock = (cell: string): string =>
        `[block:parameters]\n${JSON.stringify({ data: { 'h-0': 'K', 'h-1': 'V', '0-0': 'k', '0-1': cell }, cols: 2, rows: 1 })}\n[/block]`;

      const getCellHtml = (input: string): string => {
        const html = toHtml(mdxish(createBlock(input)));
        const match = html.match(/<tbody>.*?<tr>.*?<td[^>]*>.*?<\/td><td[^>]*>(.*?)<\/td>/s);
        return match ? match[1] : '';
      };

      it.each([
        ['\\|', '|', 'pipe escape'],
        ['yes\\|no', 'yes|no', 'pipe in text'],
        ['<placeholder>', 'placeholder', 'invalid tag escaped'],
        ['<ul><li>x</li></ul>', '<ul>', 'valid tags preserved'],
        ['`<lang>`', 'lang', 'code span content preserved'],
        ['`URL=<host>`', 'host', 'angle brackets in code'],
        ['<ul><li>_em_</li></ul>', '<em>', 'emphasis in HTML'],
        ['<ul><li>`code`</li></ul>', '<code>', 'code in HTML'],
        ['_\\<x>_', '<em>', 'backslash + emphasis'],
        ['snake_case', 'snake_case', 'underscore in word preserved'],
        ['<ol><li>[link](doc:page)</li></ol>', '<a href', 'links in HTML'],
        ['<ol><li>item</li></ol>See [link](doc:page)', '<a href="doc:page">', 'links after HTML'],
        ['[link](doc:page)<ol><li>item</li></ol>', '<a href="doc:page">', 'links before HTML'],
        ['<div title="a>b">text</div>', 'a>b', 'gt inside quoted attribute preserved'],
        ['<Glossary>parliament</Glossary>', '<Glossary>parliament</Glossary>', 'PascalCase component tags preserved'],
        ['<Anchor>link text</Anchor>', '<Anchor>link text</Anchor>', 'Anchor component tag preserved'],
        [
          '<ul><li><Glossary>term</Glossary></li></ul>',
          '<Glossary>term</Glossary>',
          'PascalCase tags inside HTML preserved',
        ],
        ['https://<i>\\<server></i>/api/login', '/api/login', 'inline close tag does not split trailing path'],
      ])('%s contains %s (%s)', (input, expected) => {
        expect(getCellHtml(input)).toContain(expected);
      });

      it('converts newlines inside HTML blocks to <br> for spacing', () => {
        const input = '<ul>\n<li>first</li>\n    text  \n  \n<li>second</li>\n</ul>';
        const html = getCellHtml(input);

        expect(html).toContain('<li>');
        expect(html).toContain('first');
        expect(html).toContain('second');
        expect(html).toContain('<br><br>');
      });

      it('escapes \\< to HTML entity', () => {
        const html = getCellHtml('\\<foo\\>');
        expect(html.includes('&lt;') || html.includes('&#x3C;')).toBe(true);
      });

      it('preserves <i> tags wrapping backslash-escaped content', () => {
        const html = getCellHtml('<i>\\<my_host></i>');
        expect(html).toContain('<i>');
        expect(html).toContain('</i>');
      });

      it('preserves <i> tags in complex cell with newlines and backslash escapes', () => {
        const input =
          'https\\://<i>\\<my_host></i>/api/login  \n  \nwhere <i>\\<my_host></i> is the FQDN of your server.';
        const cellHtml = getCellHtml(input);
        expect(cellHtml).toContain('<i>');
        expect(cellHtml).not.toContain('<i></i>');
      });

      it('separates text after closing HTML tag into its own paragraph', () => {
        const input = '<ul>\n<li>Item one.\n<li>Item two.\n</li></ul> See [link](doc:page).  \n  \nNext paragraph.';
        const cellHtml = getCellHtml(input);
        expect(cellHtml).toContain('<a');
        expect(cellHtml).toContain('</a>');
        expect(cellHtml).toContain('</a>.');
        const paragraphs = cellHtml.match(/<p>/g);
        expect(paragraphs?.length).toBeGreaterThanOrEqual(2);
      });

      it('separates text immediately after closing HTML tags with no whitespace', () => {
        const input =
          '<ol><li>Verify your configuration is correct.</ol></li>To resolve this issue, add the item to a custom list.  \n  \nFor more information, see [Add a list](doc:add-list) and [Manage settings](doc:manage-settings).';
        const cellHtml = getCellHtml(input);
        expect(cellHtml).toContain('To resolve');
        const paragraphs = cellHtml.match(/<p>/g);
        expect(paragraphs?.length).toBeGreaterThanOrEqual(2);
        expect(cellHtml).toContain('<a');
        expect(cellHtml).toContain('href="doc:add-list"');
      });

      it('separates text on the next line after a closing HTML tag into its own paragraph', () => {
        const input =
          '<ol><li>Check the activity report. For more information, see [Activity summary](doc:activity-summary).\n<li>If no data is logged, verify that the server forwards requests correctly.</li> </ol>\nYou can also configure the client to send requests directly.';
        const cellHtml = getCellHtml(input);
        expect(cellHtml).toContain('<a');
        expect(cellHtml).toContain('You can also configure');
        const paragraphs = cellHtml.match(/<p>/g);
        expect(paragraphs?.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should preserve blank lines between non-HTML lines as paragraph breaks', () => {
      const cellContent = 'First paragraph\n\nSecond paragraph';
      const md = `[block:parameters]\n${JSON.stringify({ data: { 'h-0': 'K', 'h-1': 'V', '0-0': 'a', '0-1': cellContent }, cols: 2, rows: 1 })}\n[/block]`;
      const ast = mdxish(md);

      const table = ast.children.find((c): c is Element => c.type === 'element' && c.tagName === 'table');
      expect(table).toBeDefined();

      const tbody = table!.children[1] as Element;
      const row = tbody.children[0] as Element;
      const cell = row.children[1] as Element;

      const paragraphs = cell.children.filter(c => c.type === 'element' && (c as Element).tagName === 'p');
      expect(paragraphs).toHaveLength(2);
    });

    it('should not treat leading spaces in cell content as indented code blocks', () => {
      const cellContent = '<ul>\n<li>foo</li>\n     bar baz\n  \n<li>qux</li>\n</ul>';
      const md = `[block:parameters]\n${JSON.stringify({ data: { 'h-0': 'K', 'h-1': 'V', '0-0': 'a', '0-1': cellContent }, cols: 2, rows: 1 })}\n[/block]`;
      const html = toHtml(mdxish(md));

      expect(html).not.toContain('<pre><code>');
      expect(html).toContain('bar baz');
    });

    it('should normalize malformed emphasis syntax in table cells', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Syntax Type',
      'h-1': 'Content',
      '0-0': 'Asterisk bold',
      '0-1': 'To make a body parameter optional, expand the **Huh what? **menu.',
      '1-0': 'Asterisk italic',
      '1-1': 'This has *malformed italic *text inside.',
      '2-0': 'Asterisk bold with link',
      '2-1': '**A customer issues the [restart command](https://example.com) ** in the shell',
      '3-0': 'Underscore bold',
      '3-1': 'Expand the __Whoa, who? __menu.',
      '4-0': 'Underscore italic',
      '4-1': 'This has _malformed italic _text inside.',
    },
    cols: 2,
    rows: 5,
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);

      const element = ast.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'table',
      ) as Element;

      expect(element).toBeDefined();
      expect(element.tagName).toBe('table');

      const tbody = element.children[1] as Element;

      const row0 = tbody.children[0] as Element;
      const asteriskBoldCell = row0.children[1] as Element;
      const asteriskStrong = asteriskBoldCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'strong',
      ) as Element;
      expect(asteriskStrong).toBeDefined();
      expect(asteriskStrong.tagName).toBe('strong');

      const row1 = tbody.children[1] as Element;
      const asteriskItalicCell = row1.children[1] as Element;
      const asteriskEm = asteriskItalicCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'em',
      ) as Element;
      expect(asteriskEm).toBeDefined();
      expect(asteriskEm.tagName).toBe('em');

      const row2 = tbody.children[2] as Element;
      const linkCell = row2.children[1] as Element;
      const strongWithLink = linkCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'strong',
      ) as Element;
      expect(strongWithLink).toBeDefined();
      expect(strongWithLink.tagName).toBe('strong');
      const linkElement = strongWithLink.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'a',
      ) as Element;
      expect(linkElement).toBeDefined();

      const row3 = tbody.children[3] as Element;
      const underscoreBoldCell = row3.children[1] as Element;
      const underscoreStrong = underscoreBoldCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'strong',
      ) as Element;
      expect(underscoreStrong).toBeDefined();
      expect(underscoreStrong.tagName).toBe('strong');

      const row4 = tbody.children[4] as Element;
      const underscoreItalicCell = row4.children[1] as Element;
      const underscoreEm = underscoreItalicCell.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'em',
      ) as Element;
      expect(underscoreEm).toBeDefined();
      expect(underscoreEm.tagName).toBe('em');
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

    it('should wrap code block with sidebar: true in rdme-pin element', () => {
      const md = `[block:code]
{
  "sidebar": true,
  "codes": [
    {
      "code": "const sidebar = 'deprecated'",
      "language": "javascript"
    }
  ]
}
[/block]`;

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);

      const rdmePin = ast.children[0] as Element;
      expect(rdmePin.tagName).toBe('rdme-pin');
      expect(rdmePin.properties.className).toContain('pin');

      const codeTabs = rdmePin.children.find(c => (c as Element).tagName === 'CodeTabs') as Element;
      expect(codeTabs).toBeDefined();
      expect(codeTabs.tagName).toBe('CodeTabs');
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

      // Find the embed element - may be direct child or wrapped in paragraph
      const embedElement = ast.children
        .filter((c): c is Element => c.type === 'element')
        .flatMap(el =>
          el.tagName === 'embed'
            ? [el]
            : el.tagName === 'p' && (el.children?.[0] as Element)?.tagName === 'embed'
              ? [el.children[0] as Element]
              : [],
        )[0];

      expect(embedElement).toBeDefined();
      expect(embedElement!.type).toBe('element');
      expect(embedElement!.tagName).toBe('embed');
      expect(embedElement!.properties.url).toBe(
        'https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4',
      );
      expect(embedElement!.properties.provider).toBe('youtube.com');
      expect(embedElement!.properties.href).toBe(
        'https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4',
      );
      expect(embedElement!.properties.typeOfEmbed).toBe('youtube');
    });
  });

  describe('callout block', () => {
    it('should restore callout block with title and body', () => {
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

      expect(calloutElement.properties.empty).toBeUndefined();

      const titleHeading = calloutElement.children[0] as Element;
      expect(titleHeading.tagName).toBe('h3');
      expect(titleHeading.children).toHaveLength(1);
      expect((titleHeading.children[0] as { value: string }).value).toBe('Note');

      const bodyParagraph = calloutElement.children[1] as Element;
      expect(bodyParagraph.tagName).toBe('p');
    });

    it('should set empty property when callout has no title', () => {
      const md = '[block:callout]{"type":"info","body":"This is important"}[/block]';

      const ast = mdxish(md);
      const calloutElement = ast.children[0] as Element;

      expect(calloutElement.properties.empty).toBe('true');

      // Should have 2 children: empty heading placeholder + body paragraph
      expect(calloutElement.children).toHaveLength(2);
      const emptyHeading = calloutElement.children[0] as Element;
      expect(emptyHeading.tagName).toBe('h3');

      const bodyParagraph = calloutElement.children[1] as Element;
      expect(bodyParagraph.tagName).toBe('p');
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

      expect(calloutElement.properties.empty).toBeUndefined();

      const titleHeading = calloutElement.children[0] as Element;
      expect(titleHeading.tagName).toBe('h3');
      expect(titleHeading.children.length).toBeGreaterThan(0);
      expect((titleHeading.children[0] as Element).tagName).toBe('em');

      const bodyParagraph = calloutElement.children[1] as Element;

      const bodyChildren = bodyParagraph.children as Element[];
      expect(bodyChildren.some(child => child.tagName === 'em')).toBe(true);
      expect(bodyChildren.some(child => child.tagName === 'strong')).toBe(true);
      expect(bodyChildren.some(child => child.tagName === 'code')).toBe(true);
    });

    it('should handle all callout types correctly', () => {
      const types = [
        { type: 'info', expectedIcon: '📘', expectedTheme: 'info' },
        { type: 'warning', expectedIcon: '🚧', expectedTheme: 'warn' },
        { type: 'danger', expectedIcon: '❗️', expectedTheme: 'error' },
        { type: 'success', expectedIcon: '👍', expectedTheme: 'okay' },
      ];

      types.forEach(({ type, expectedIcon, expectedTheme }) => {
        const md = `[block:callout]{"type":"${type}","title":"Title","body":"Body"}[/block]`;
        const ast = mdxish(md);
        const calloutElement = ast.children[0] as Element;

        expect(calloutElement.properties.icon).toBe(expectedIcon);
        expect(calloutElement.properties.theme).toBe(expectedTheme);
        expect(calloutElement.properties.type).toBe(expectedTheme);
      });
    });
  });

  describe('magic blocks in lists', () => {
    it('should preserve list structure when magic block is a list item', () => {
      const md = `- <br />

- [block:tutorial-tile]{"backgroundColor":"#018FF4","emoji":"🦉","id":"6969d34fdc1aff2380513c23","link":"http://legacy.readme.local:3000/v1.0/recipes/recipe-title","slug":"recipe-title","title":"Recipe Title"}[/block]

- [block:html]
    {
      "html":"<h1>Hoo ha</h1>"
    }
  [/block]

- [block:parameters]{"data":{"h-0":"Response","h-1":"","0-0":"{'Message': 'There are **validation errors**', 'Errors': ['ConsumerDetails: <div>The ExternalId or CustomerID</div> must have a value.']}","0-1":""},"cols":2,"rows":1,"align":[null,null]}[/block]

- [block:embed]{"url":"https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4","provider":"youtube.com","href":"https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4","typeOfEmbed":"youtube"}[/block]`;

      const ast = mdxish(md);
      const listElements = ast.children.filter(
        (child): child is Element => child.type === 'element' && child.tagName === 'ul',
      );

      expect(listElements).toHaveLength(1);
      expect(
        listElements[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li'),
      ).toHaveLength(5);
    });

    it('should not create extra newlines when tutorial-tile block is in a list item', () => {
      const md = '- [block:tutorial-tile]{"emoji":"🦉","slug":"recipe-title","title":"Recipe Title"}[/block]';

      const ast = mdxish(md);

      expect(ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ul')).toHaveLength(1);

      const list = ast.children.find((c): c is Element => c.type === 'element' && c.tagName === 'ul') as Element;
      const listItems = list.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(1);

      const firstItem = listItems[0];
      const hasRecipe = JSON.stringify(firstItem).includes('Recipe');
      expect(hasRecipe).toBe(true);
    });

    it('should not create extra newlines when html block is in a list item', () => {
      const md = '- [block:html]{"html":"<h1>Hello</h1>"}[/block]';

      const ast = mdxish(md);

      const lists = ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ul');
      expect(lists).toHaveLength(1);

      const listItems = lists[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(1);
    });

    it('should not create extra newlines when embed block is in a list item', () => {
      const md =
        '- [block:embed]{"url":"https://www.youtube.com/watch?v=FVikHLyW500","provider":"youtube.com","href":"https://www.youtube.com/watch?v=FVikHLyW500","typeOfEmbed":"youtube"}[/block]';

      const ast = mdxish(md);

      const lists = ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ul');
      expect(lists).toHaveLength(1);

      const listItems = lists[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(1);
    });

    it('should not create extra newlines when parameters block is in a list item', () => {
      const md = '- [block:parameters]{"data":{"h-0":"Header","0-0":"Value"},"cols":1,"rows":1}[/block]';

      const ast = mdxish(md);

      const lists = ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ul');
      expect(lists).toHaveLength(1);

      const listItems = lists[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(1);
    });

    it('should handle mixed content lists with magic blocks', () => {
      const md = `- Regular text item
- [block:callout]{"type":"info","title":"Note","body":"Info"}[/block]
- Another text item`;

      const ast = mdxish(md);

      const lists = ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ul');
      expect(lists).toHaveLength(1);

      const listItems = lists[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(3);
    });

    it('should not split a list when magic block appears in the middle', () => {
      const md = `- First item
- Second item
- [block:html]
    {
      "html":"<strong>Magic block content</strong>"
    }
  [/block]
- Fourth item
- Fifth item`;

      const ast = mdxish(md);

      const lists = ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ul');
      expect(lists).toHaveLength(1);

      const listItems = lists[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(5);

      const thirdItem = listItems[2];
      const hasHtmlBlock =
        JSON.stringify(thirdItem).includes('html-block') || JSON.stringify(thirdItem).includes('strong');
      expect(hasHtmlBlock).toBe(true);
    });

    it('should not split a list when tutorial-tile block appears in the middle', () => {
      const md = `- First item
- Second item
- [block:tutorial-tile]{"emoji":"🦉","slug":"recipe","title":"Recipe"}[/block]
- Fourth item
- Fifth item`;

      const ast = mdxish(md);

      const lists = ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ul');
      expect(lists).toHaveLength(1);

      const listItems = lists[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(5);
    });

    it('should handle indented magic block in nested list with continuation', () => {
      const md = `1. Navigate to the **Settings** page, select a specific option.
2. On the selected option's page, you can perform actions:

   [block:image]{"images":[{"image":["https://files.readme.io/test.png",null,"Screenshot"],"align":"center","border":true}]}[/block]

   1. View the option's attributes:
      - Label (editable)
      - Description (editable)`;

      const ast = mdxish(md);

      const lists = ast.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'ol');
      expect(lists).toHaveLength(1);

      const listItems = lists[0].children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(listItems).toHaveLength(2);

      const secondItem = listItems[1];
      const hasImage = JSON.stringify(secondItem).includes('img') || JSON.stringify(secondItem).includes('figure');
      expect(hasImage).toBe(true);

      const nestedOl = secondItem.children.find((c): c is Element => c.type === 'element' && c.tagName === 'ol');
      expect(nestedOl).toBeDefined();

      const nestedItems = nestedOl?.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      expect(nestedItems?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('malformed JSON handling', () => {
    it('should gracefully handle image block with missing images array', () => {
      // This format is invalid - images should be an array, not a direct url
      const md = `[block:image]
{
  "url": "test.png"
}
[/block]`;

      // Should not throw an error
      expect(() => mdxish(md)).not.toThrow();

      const ast = mdxish(md);
      // Should produce a placeholder image element so the editor can show "Choose Image" UI
      const images = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'img');
      expect(images).toHaveLength(1);
    });

    it('should gracefully handle image block with non-array images', () => {
      const md = `[block:image]
{
  "images": "not-an-array"
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should gracefully handle code block with missing codes array', () => {
      const md = `[block:code]
{
  "code": "console.log('hello')",
  "language": "javascript"
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();

      const ast = mdxish(md);
      // Should produce a placeholder code element so the editor can show empty code block
      const codeBlocks = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'pre');
      expect(codeBlocks).toHaveLength(1);
    });

    it('should gracefully handle code block with non-array codes', () => {
      const md = `[block:code]
{
  "codes": "not-an-array"
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should gracefully handle parameters block with missing data object', () => {
      const md = `[block:parameters]
{
  "cols": 2,
  "rows": 1
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();

      const ast = mdxish(md);
      expect(ast.children.filter(c => c.type === 'element')).toHaveLength(0);
    });

    it('should gracefully handle parameters block with invalid cols/rows', () => {
      const md = `[block:parameters]
{
  "data": {"h-0": "Header"},
  "cols": "invalid",
  "rows": 1
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should gracefully handle embed block with missing url', () => {
      const md = `[block:embed]
{
  "title": "My Embed"
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();

      const ast = mdxish(md);
      const embeds = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'embed');
      expect(embeds).toHaveLength(1);
      // Verify the placeholder has empty url property
      const embedElement = embeds[0] as Element;
      expect(embedElement.properties?.url).toBe('');
    });

    it('should gracefully handle html block with missing html property', () => {
      const md = `[block:html]
{
  "content": "<h1>Hello</h1>"
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();

      const ast = mdxish(md);
      expect(ast.children.filter(c => c.type === 'element')).toHaveLength(0);
    });

    it('should gracefully handle recipe block with missing required fields', () => {
      const md = `[block:recipe]
{
  "emoji": "🦉"
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();

      const ast = mdxish(md);
      expect(ast.children.filter(c => c.type === 'element')).toHaveLength(0);
    });

    it('should gracefully handle callout block with missing title and body', () => {
      const md = `[block:callout]
{
  "type": "info"
}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();

      const ast = mdxish(md);
      expect(ast.children.filter(c => c.type === 'element')).toHaveLength(0);
    });

    it('should gracefully handle empty JSON object', () => {
      const md = `[block:image]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });
  });

  describe('malformed syntax handling', () => {
    it('should treat [block:] (empty type name) as plain text', () => {
      const md = `[block:]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const magicBlocks = ast.children.filter(c => c.type === 'element' && c.tagName?.startsWith('MagicBlock'));
      expect(magicBlocks).toHaveLength(0);
      const textContent = ast.children.filter(c => c.type === 'text' || c.type === 'element');
      expect(textContent.length).toBeGreaterThan(0);
    });

    it('should not error if there is newlines before the data object', () => {
      const md = `[block:callout]


{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should not error if there is newlines after the data object', () => {
      const md = `[block:callout]
{}


[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should not error if there is newlines before and after the data object', () => {
      const md = `[block:callout]

{}

[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should treat [block:] in a list as plain text', () => {
      const md = '- [block:]{}[/block]';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const lists = ast.children.filter(c => c.type === 'element' && c.tagName === 'ul');
      expect(lists).toHaveLength(1);
    });

    it('should render unknown block type as raw text', () => {
      const md = '[block:unknowntype]{"foo":"bar"}[/block]';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const paragraphs = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'p');
      expect(paragraphs).toHaveLength(1);
      const textContent = JSON.stringify(paragraphs[0]);
      expect(textContent).toContain('[block:unknowntype]');
    });

    it('should render unknown block type with empty data as raw text', () => {
      const md = '[block:foo]{}[/block]';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const paragraphs = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'p');
      expect(paragraphs).toHaveLength(1);
      const textContent = JSON.stringify(paragraphs[0]);
      expect(textContent).toContain('[block:foo]');
    });

    it('should render multiline unknown block type as multiple paragraphs', () => {
      const md = `[block:foo]

AAAA

[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const paragraphs = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'p');
      expect(paragraphs).toHaveLength(3);
    });

    it('should treat known block type with non-JSON data as plain text', () => {
      const md = `[block:callout]

asdasdasd

[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const paragraphs = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'p');
      expect(paragraphs).toHaveLength(3);
      expect(JSON.stringify(paragraphs[0])).toContain('[block:callout]');
    });

    it('should handle unclosed block (no [/block])', () => {
      const md = '[block:callout]{"type":"info"}';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle missing closing bracket on opening marker', () => {
      const md = '[block:callout{"type":"info"}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle invalid/malformed JSON gracefully', () => {
      const md = '[block:callout]{type: info, broken json}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle nested block markers', () => {
      const md = '[block:callout]{"body":"[block:code]{}[/block]"}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle partial closing marker [/bloc]', () => {
      const md = '[block:callout]{}[/bloc]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle partial closing marker [/]', () => {
      const md = '[block:callout]{}[/]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle block with only whitespace before JSON', () => {
      const md = '[block:callout]   {}[/block]';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      // Should parse as a valid callout
      const callouts = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'Callout');
      expect(callouts).toHaveLength(1);
    });

    it('should handle block type with numbers', () => {
      const md = '[block:type123]{}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle empty string as block type', () => {
      const md = '[block:]{}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle special characters after block marker', () => {
      const md = '[block:callout]!@#$%^&*(){}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle JSON with escaped quotes', () => {
      const md = '[block:callout]{"body":"say \\"hello\\""}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle JSON with unicode', () => {
      const md = '[block:callout]{"body":"🎉 emoji test 日本語"}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle very long content without crashing', () => {
      const longContent = 'a'.repeat(10000);
      const md = `[block:callout]{"body":"${longContent}"}[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle multiple blocks in sequence', () => {
      const md = '[block:callout]{}[/block][block:callout]{}[/block]';

      expect(() => mdxish(md)).not.toThrow();
    });

    it('should handle block immediately followed by another block', () => {
      const md = `[block:callout]{"type":"info"}[/block]
[block:code]{"codes":[{"code":"test","language":"js"}]}[/block]`;

      expect(() => mdxish(md)).not.toThrow();
    });
  });

  describe('trailing content after [/block]', () => {
    it('should handle trailing whitespace after [/block]', () => {
      const md = '[block:image]{"images":[{"image":["https://example.com/img.png"]}]}[/block] ';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const images = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'img');
      expect(images).toHaveLength(1);
    });

    it('should handle trailing newline after [/block]', () => {
      const md = '[block:image]{"images":[{"image":["https://example.com/img.png"]}]}[/block]\n';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const images = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'img');
      expect(images).toHaveLength(1);
    });

    it('should handle trailing text after [/block]', () => {
      const md = '[block:image]{"images":[{"image":["https://example.com/img.png"]}]}[/block]some text after';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const paragraph = ast.children.find(c => c.type === 'element' && (c as Element).tagName === 'p') as Element;
      expect(paragraph).toBeDefined();
      const img = paragraph.children.find(c => c.type === 'element' && (c as Element).tagName === 'img');
      expect(img).toBeDefined();
    });

    it('should handle multiple spaces after [/block]', () => {
      const md = '[block:image]{"images":[{"image":["https://example.com/img.png"]}]}[/block]   ';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const images = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'img');
      expect(images).toHaveLength(1);
    });

    it('should handle tabs after [/block]', () => {
      const md = '[block:callout]{"type":"info","title":"Test","body":"Content"}[/block]\t';

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const callouts = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'Callout');
      expect(callouts).toHaveLength(1);
    });

    it('should handle content on the same line after multiline [/block]', () => {
      const md = `[block:parameters]
{
  "data": {"h-0": "Header", "0-0": "Value"},
  "cols": 1,
  "rows": 1
}
[/block] trailing content`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const tables = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'table');
      expect(tables).toHaveLength(1);
    });
  });

  describe('empty data handling', () => {
    it('should return placeholder image for image block with empty data', () => {
      const md = `[block:image]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const images = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'img');
      expect(images).toHaveLength(1);
    });

    it('should return placeholder code block for code block with empty data', () => {
      const md = `[block:code]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const codeBlocks = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'pre');
      expect(codeBlocks).toHaveLength(1);
    });

    it('should return placeholder embed for embed block with empty data', () => {
      const md = `[block:embed]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const embeds = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'embed');
      expect(embeds).toHaveLength(1);
    });

    it('should return placeholder recipe for recipe block with empty data', () => {
      const md = `[block:recipe]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const recipes = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'Recipe');
      expect(recipes).toHaveLength(1);
    });

    it('should return placeholder callout for callout block with empty data', () => {
      const md = `[block:callout]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const callouts = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'Callout');
      expect(callouts).toHaveLength(1);
    });

    it('should return placeholder table for parameters block with empty data', () => {
      const md = `[block:parameters]
{}
[/block]`;

      expect(() => mdxish(md)).not.toThrow();
      const ast = mdxish(md);
      const tables = ast.children.filter(c => c.type === 'element' && (c as Element).tagName === 'table');
      expect(tables).toHaveLength(1);
    });
  });
});
