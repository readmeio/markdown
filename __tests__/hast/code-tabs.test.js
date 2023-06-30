import { hast } from '../../index';

describe('hast code-tabs', () => {
  it('should allow the tabs prop', () => {
    const md = `
\`\`\`js
const test = true;
\`\`\`
\`\`\`ruby
test = true;
\`\`\`
    `;

    const tree = hast(md);

    expect(tree).toMatchInlineSnapshot(`
      Object {
        "children": Array [
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "text",
                        "value": "const test = true;
      ",
                      },
                    ],
                    "properties": Object {
                      "className": Array [
                        "language-js",
                      ],
                      "lang": "js",
                      "meta": "",
                    },
                    "tagName": "code",
                    "type": "element",
                  },
                ],
                "properties": Object {},
                "tagName": "pre",
                "type": "element",
              },
              Object {
                "children": Array [
                  Object {
                    "children": Array [
                      Object {
                        "type": "text",
                        "value": "test = true;
      ",
                      },
                    ],
                    "properties": Object {
                      "className": Array [
                        "language-ruby",
                      ],
                      "lang": "ruby",
                      "meta": "",
                    },
                    "tagName": "code",
                    "type": "element",
                  },
                ],
                "properties": Object {},
                "tagName": "pre",
                "type": "element",
              },
            ],
            "properties": Object {
              "className": Array [
                "code-tabs",
              ],
            },
            "tagName": "div",
            "type": "element",
          },
        ],
        "data": Object {
          "quirksMode": false,
        },
        "type": "root",
      }
    `);
  });
});
