import { hast } from '../../index';

describe('hast(doc, { mdx: true })', () => {
  it('parses basic content', () => {
    const doc = `
# Heading

<h1>JSX version</h1>
    `;

    const ast = hast(doc, { mdx: true });

    expect(ast).toMatchInlineSnapshot(`
      Object {
        "children": Array [
          Object {
            "children": Array [
              Object {
                "type": "text",
                "value": "Heading",
              },
            ],
            "properties": Object {
              "id": "heading",
            },
            "tagName": "h1",
            "type": "element",
          },
          Object {
            "type": "text",
            "value": "
      <h1>JSX version</h1>
          ",
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
