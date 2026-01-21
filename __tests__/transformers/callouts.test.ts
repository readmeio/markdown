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
