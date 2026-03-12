import type { Callout } from '../../types';
import type { Blockquote, Heading, List, Paragraph } from 'mdast';

import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../index';
import calloutTransformer from '../../processor/transform/callouts';

describe('callouts transformer', () => {
  it('can parse callouts', () => {
    const md = `
> 🚧 It works!
>
> And, it no longer deletes your content!
`;
    const tree = mdast(md);
    removePosition(tree, { force: true });

    expect(tree.children[0]).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "children": [
              {
                "type": "text",
                "value": "It works!",
              },
            ],
            "depth": 3,
            "type": "heading",
          },
          {
            "children": [
              {
                "type": "text",
                "value": "And, it no longer deletes your content!",
              },
            ],
            "type": "paragraph",
          },
        ],
        "data": {
          "hName": "Callout",
          "hProperties": {
            "icon": "🚧",
            "theme": "warn",
          },
        },
        "type": "rdme-callout",
      }
    `);
  });

  it('can parse callouts with markdown in the heading', () => {
    const md = `
> 🚧 It **works!**
>
> And, it no longer deletes your content!
`;
    const tree = mdast(md);

    expect(tree.children[0].children[0].children[1].type).toBe('strong');
  });

  it('can parse callouts with markdown in the heading immediately following the emoji', () => {
    const md = `
> 🚧**It works!**
>
> And, it no longer deletes your content!
`;
    const tree = mdast(md);

    expect(tree.children[0].data.hProperties.empty).toBeUndefined();
    expect(tree.children[0].children[0].children[1].type).toBe('strong');
  });

  it('can parse callouts with a link in the heading', () => {
    const md = `
> 🚧 [It works!](https://example.com)
>
> And, it no longer deletes your content!
`;
    const tree = mdast(md);
    removePosition(tree, { force: true });

    expect(tree.children[0]).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "children": [
              {
                "type": "text",
                "value": "",
              },
              {
                "children": [
                  {
                    "type": "text",
                    "value": "It works!",
                  },
                ],
                "title": null,
                "type": "link",
                "url": "https://example.com",
              },
            ],
            "depth": 3,
            "type": "heading",
          },
          {
            "children": [
              {
                "type": "text",
                "value": "And, it no longer deletes your content!",
              },
            ],
            "type": "paragraph",
          },
        ],
        "data": {
          "hName": "Callout",
          "hProperties": {
            "icon": "🚧",
            "theme": "warn",
          },
        },
        "type": "rdme-callout",
      }
    `);
  });

  it('can parse callouts with inline code in the heading', () => {
    const md = `
> 🚧 \`It works!\`
>
> And, it no longer deletes your content!
`;
    const tree = mdast(md);
    removePosition(tree, { force: true });

    expect(tree.children[0]).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "children": [
              {
                "type": "text",
                "value": "",
              },
              {
                "type": "inlineCode",
                "value": "It works!",
              },
            ],
            "depth": 3,
            "type": "heading",
          },
          {
            "children": [
              {
                "type": "text",
                "value": "And, it no longer deletes your content!",
              },
            ],
            "type": "paragraph",
          },
        ],
        "data": {
          "hName": "Callout",
          "hProperties": {
            "icon": "🚧",
            "theme": "warn",
          },
        },
        "type": "rdme-callout",
      }
    `);
  });

  it('can parse a jsx callout into a rdme-callout', () => {
    const md = `
<Callout icon="📘" theme="info">
### This is a callout
</Callout>`;

    const tree = mdast(md);

    expect(tree.children[0]).toHaveProperty('type', 'rdme-callout');
  });

  it('can parse a jsx callout without an icon', () => {
    const md = `
<Callout theme="info">
### This is a callout
</Callout>`;

    const tree = mdast(md);

    expect(tree.children[0].data.hProperties).toMatchInlineSnapshot(`
      {
        "icon": undefined,
        "theme": "info",
      }
    `);
  });

  it('can parse a jsx callout and set a theme from the icon', () => {
    const md = `
<Callout icon="📘">
### This is a callout
</Callout>`;

    const tree = mdast(md);

    expect(tree.children[0].data.hProperties).toHaveProperty('theme', 'info');
  });

  it('can correctly wrap a heading around a callout with a complex title and preserve the correct position data', () => {
    const md = '> 📘 This is a callout [**with** a _link_](https://example.com)';

    const tree = mdast(md);

    // @ts-expect-error -- children should be defined
    expect(tree.children[0].children[0].position).toMatchInlineSnapshot(`
      {
        "end": {
          "column": 64,
          "line": 1,
          "offset": 63,
        },
        "start": {
          "column": 6,
          "line": 1,
          "offset": 5,
        },
      }
    `);
  });

  it('can parse a jsx callout and set a theme from the icon "👍"', () => {
    const md = `
<Callout icon="👍">
### This is a callout
</Callout>`;

    const tree = mdast(md);

    expect(tree.children[0].data.hProperties).toHaveProperty('theme', 'okay');
  });

  it('can parse a callout with only 2 blockquotes, and not make the second blockquote content a heading', () => {
    const md = `> 📘
> As an Admin, you need the **IDM: Users - Admin Access** permission included`;
    const tree = mdast(md);

    // The body content should be a paragraph and not under a heading node
    expect(tree.children[0]).toHaveProperty('type', 'rdme-callout');
    const calloutNodeChildren = (tree.children[0] as Callout).children;
    expect(calloutNodeChildren).toHaveLength(2);

    // There should be empty text under the heading node
    expect(calloutNodeChildren[0].type).toBe('heading');
    expect((calloutNodeChildren[0] as Heading).children).toHaveLength(1);
    expect((calloutNodeChildren[0] as Heading).children[0]).toHaveProperty('value', '');

    // Body paragraph should have the text content
    expect(calloutNodeChildren[1].type).toBe('paragraph');
  });

  describe('block-level title content', () => {
    it('parses a heading with italic in the title', () => {
      const md = '> 📘 # _Foo_\n>\n> Hello.';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toMatchInlineSnapshot(`
        {
          "children": [
            {
              "children": [
                {
                  "type": "text",
                  "value": "",
                },
                {
                  "children": [
                    {
                      "type": "text",
                      "value": "Foo",
                    },
                  ],
                  "type": "emphasis",
                },
              ],
              "depth": 1,
              "type": "heading",
            },
            {
              "children": [
                {
                  "type": "text",
                  "value": "Hello.",
                },
              ],
              "type": "paragraph",
            },
          ],
          "data": {
            "hName": "Callout",
            "hProperties": {
              "icon": "📘",
              "theme": "info",
            },
          },
          "type": "rdme-callout",
        }
      `);
    });

    it('parses a blockquote marker as the title', () => {
      const md = '> 📘 >\n>\n> Hello.';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toMatchInlineSnapshot(`
        {
          "children": [
            {
              "children": [
                {
                  "children": [],
                  "type": "blockquote",
                },
              ],
              "depth": 3,
              "type": "heading",
            },
            {
              "children": [
                {
                  "type": "text",
                  "value": "Hello.",
                },
              ],
              "type": "paragraph",
            },
          ],
          "data": {
            "hName": "Callout",
            "hProperties": {
              "icon": "📘",
              "theme": "info",
            },
          },
          "type": "rdme-callout",
        }
      `);
    });

    it('parses a blockquote with text as the title', () => {
      const md = '> 📘 > helo\n>\n> Hello.';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toMatchInlineSnapshot(`
        {
          "children": [
            {
              "children": [
                {
                  "children": [
                    {
                      "children": [
                        {
                          "type": "text",
                          "value": "helo",
                        },
                      ],
                      "type": "paragraph",
                    },
                  ],
                  "type": "blockquote",
                },
              ],
              "depth": 3,
              "type": "heading",
            },
            {
              "children": [
                {
                  "type": "text",
                  "value": "Hello.",
                },
              ],
              "type": "paragraph",
            },
          ],
          "data": {
            "hName": "Callout",
            "hProperties": {
              "icon": "📘",
              "theme": "info",
            },
          },
          "type": "rdme-callout",
        }
      `);
    });

    it('does not convert a blockquote with emoji in the title into a nested callout', () => {
      const md = '> 📘 > 🚧 emoji in title\n>\n> Hello.';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const callout = tree.children[0] as Callout;
      expect(callout.type).toBe('rdme-callout');
      expect(callout.data.hProperties.icon).toBe('📘');

      const heading = callout.children[0] as Heading;
      expect(heading.type).toBe('heading');
      expect(heading.children[0]).toHaveProperty('type', 'blockquote');
    });

    it('parses a dash as the title into a list', () => {
      const md = '> 📘 -\n>\n> Hello.';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toMatchInlineSnapshot(`
        {
          "children": [
            {
              "children": [
                {
                  "children": [
                    {
                      "checked": null,
                      "children": [],
                      "spread": false,
                      "type": "listItem",
                    },
                  ],
                  "ordered": false,
                  "spread": false,
                  "start": null,
                  "type": "list",
                },
              ],
              "depth": 3,
              "type": "heading",
            },
            {
              "children": [
                {
                  "type": "text",
                  "value": "Hello.",
                },
              ],
              "type": "paragraph",
            },
          ],
          "data": {
            "hName": "Callout",
            "hProperties": {
              "icon": "📘",
              "theme": "info",
            },
          },
          "type": "rdme-callout",
        }
      `);
    });

    it.each([
      {
        name: 'link in a blockquote title',
        md: '> 👍 > [Hello](https://example.com)\n>\n> Body.',
        blockType: 'blockquote',
        expectedTypes: ['link'],
      },
      {
        name: 'bold and link in a blockquote title',
        md: '> 📘 > **bold** [link](https://example.com)\n>\n> Body.',
        blockType: 'blockquote',
        expectedTypes: ['strong', 'link'],
      },
      {
        name: 'italic in a blockquote title',
        md: '> 📘 > _italic_ text\n>\n> Body.',
        blockType: 'blockquote',
        expectedTypes: ['emphasis'],
      },
      {
        name: 'link in a list title',
        md: '> 📘 - [list link](https://example.com)\n>\n> Body.',
        blockType: 'list',
        expectedTypes: ['link'],
      },
      {
        name: 'strikethrough (~~) in a blockquote title',
        md: '> 👍 > ~~hello~~',
        blockType: 'blockquote',
        expectedTypes: ['delete'],
      },
      {
        name: 'strikethrough (~) in a blockquote title',
        md: '> 👍 > ~hello~',
        blockType: 'blockquote',
        expectedTypes: ['delete'],
      },
    ])('preserves $name', ({ md, blockType, expectedTypes }) => {
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const callout = tree.children[0] as Callout;
      const heading = callout.children[0] as Heading;
      const block = heading.children[0];
      expect(block).toHaveProperty('type', blockType);

      const paragraph =
        blockType === 'list'
          ? ((block as unknown as List).children[0].children[0] as Paragraph)
          : ((block as unknown as Blockquote).children[0] as Paragraph);

      const childTypes = paragraph.children.map(c => c.type);
      expectedTypes.forEach(type => expect(childTypes).toContain(type));
    });

    it('parses bold text as a heading title', () => {
      const md = '> 📘 **bolf**\n>\n> Hello.';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toMatchInlineSnapshot(`
        {
          "children": [
            {
              "children": [
                {
                  "type": "text",
                  "value": "",
                },
                {
                  "children": [
                    {
                      "type": "text",
                      "value": "bolf",
                    },
                  ],
                  "type": "strong",
                },
              ],
              "depth": 3,
              "type": "heading",
            },
            {
              "children": [
                {
                  "type": "text",
                  "value": "Hello.",
                },
              ],
              "type": "paragraph",
            },
          ],
          "data": {
            "hName": "Callout",
            "hProperties": {
              "icon": "📘",
              "theme": "info",
            },
          },
          "type": "rdme-callout",
        }
      `);
    });
  });

  describe('nested callouts', () => {
    it('parses nested callouts inside a callout body', () => {
      const md = `> 📘 Outer
>
> > 🚧 Inner
> > Content`;
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const outer = tree.children[0] as Callout;
      expect(outer.type).toBe('rdme-callout');
      expect(outer.data.hProperties.icon).toBe('📘');

      const inner = outer.children.find(c => (c as unknown as { type: string }).type === 'rdme-callout') as
        | Callout
        | undefined;
      expect(inner).toBeDefined();
      expect(inner!.data.hProperties.icon).toBe('🚧');
    });
  });

  describe('non-callout blockquotes', () => {
    it('replaces empty blockquote with paragraph containing ">"', () => {
      const md = '>';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const transformer = calloutTransformer();
      transformer(tree);

      // Empty blockquote should be replaced with paragraph
      const hasBlockquote = tree.children.some(child => child.type === 'blockquote');
      expect(hasBlockquote).toBe(false);

      // Should have a paragraph with '>' as content
      const hasParagraph = tree.children.some(
        child =>
          child.type === 'paragraph' &&
          'children' in child &&
          child.children.some(
            (c: unknown) =>
              c && typeof c === 'object' && 'type' in c && c.type === 'text' && 'value' in c && c.value === '>',
          ),
      );
      expect(hasParagraph).toBe(true);
    });

    it('leaves blockquote with text but no emoji as blockquote', () => {
      const md = '> some text without emoji';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const transformer = calloutTransformer();
      transformer(tree);

      // Blockquote with valid structure (paragraph > text) but no emoji should remain as blockquote
      const hasBlockquote = tree.children.some(child => child.type === 'blockquote');
      expect(hasBlockquote).toBe(true);
    });

    it('should parse a blockquote containing only an image correctly', () => {
      const md = `
> ![](https://example.com/image.png)
`;

      const tree = mdast(md, { missingComponents: 'ignore' });
      const transformer = calloutTransformer();
      transformer(tree);

      // Blockquote should remain as blockquote
      const hasBlockquote = tree.children.some(child => child.type === 'blockquote');
      expect(hasBlockquote).toBe(true);

      // Inside the blockquote, there should be an image inside a paragraph
      const blockquote = tree.children.find(child => child.type === 'blockquote') as {
        children: { children?: { type: string; url?: string }[]; type: string }[];
      };
      expect(blockquote).toBeDefined();
      const hasImage = blockquote.children.some(
        child =>
          child.type === 'paragraph' &&
          child.children?.some(c => c.type === 'image' && c.url === 'https://example.com/image.png'),
      );
      expect(hasImage).toBe(true);
    });
  });
});
