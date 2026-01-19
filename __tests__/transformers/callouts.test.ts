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

  describe('format-specific behavior for empty blockquotes', () => {
    it('with format "mdx" (or undefined) - leaves empty blockquote as-is', () => {
      const md = '>';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const transformer = calloutTransformer({ format: 'mdx' });
      transformer(tree);

      // Empty blockquote should remain as blockquote when format is 'mdx'
      const hasBlockquote = tree.children.some(child => child.type === 'blockquote');
      expect(hasBlockquote).toBe(true);
    });

    it('with format undefined - leaves empty blockquote as-is', () => {
      const md = '>';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const transformer = calloutTransformer();
      transformer(tree);

      // Empty blockquote should remain as blockquote when format is undefined
      const hasBlockquote = tree.children.some(child => child.type === 'blockquote');
      expect(hasBlockquote).toBe(true);
    });

    it('with format "md" - replaces empty blockquote with paragraph containing stringified content', () => {
      const md = '>';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const transformer = calloutTransformer({ format: 'md' });
      transformer(tree);

      // Empty blockquote should be replaced with paragraph when format is 'md'
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
  });
});
