import { mdast } from '../../index';

describe('gemoji parser', () => {
  it('should output an emoji node for a known emoji', () => {
    const markdown = `This is a gemoji :joy:.`;
    const tree = mdast(markdown);

    expect(tree.children[0].children[1]).toMatchInlineSnapshot(`
      {
        "name": "joy",
        "type": "gemoji",
        "value": "😂",
      }
    `);
  });

  it('should output an image node for a readme emoji', () => {
    const markdown = `This is a gemoji :owlbert:.`;

    expect(mdast(markdown).children[0].children[1]).toMatchInlineSnapshot(`
      {
        "alt": ":owlbert:",
        "data": {
          "hProperties": {
            "align": "absmiddle",
            "className": "emoji",
            "height": "20",
            "width": "20",
          },
        },
        "title": ":owlbert:",
        "type": "image",
        "url": "/public/img/emojis/owlbert.png",
      }
    `);
  });

  it('should output an <i> for a font awesome icon', () => {
    const markdown = `This is a gemoji :fa-lock:.`;
    const tree = mdast(markdown);

    expect(tree.children[0].children[1]).toMatchInlineSnapshot(`
      {
        "data": {
          "hName": "i",
          "hProperties": {
            "className": [
              "fa-regular",
              "fa-lock",
            ],
          },
        },
        "type": "i",
        "value": "fa-lock",
      }
    `);
  });

  it('should output nothing for unknown emojis', () => {
    const markdown = `This is a gemoji :unknown-emoji:.`;

    expect(mdast(markdown).children[0].children[0].value).toMatch(/:unknown-emoji:/);
  });
});
