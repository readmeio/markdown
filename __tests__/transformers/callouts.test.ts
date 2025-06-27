import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../index';

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

  it('can parse a jsx callout into a rdme-callout', () => {
    const md = `
<Callout icon="📘" theme="info">
### This is a callout
</Callout>`;

    const tree = mdast(md);

    expect(tree.children[0]).toHaveProperty('type', 'rdme-callout');
  });

  it('can parse a jsx callout and sets a default icon', () => {
    const md = `
<Callout theme="info">
### This is a callout
</Callout>`;

    const tree = mdast(md);

    expect(tree.children[0].data.hProperties).toHaveProperty('icon', '📘');
  });

  it('can parse a jsx callout and set a theme from the icon', () => {
    const md = `
<Callout icon="📘">
### This is a callout
</Callout>`;

    const tree = mdast(md);

    expect(tree.children[0].data.hProperties).toHaveProperty('theme', 'info');
  });
});
