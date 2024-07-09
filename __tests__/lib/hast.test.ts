import { hast, hastFromHtml } from '../../lib';
import { h } from 'hastscript';

describe('hast transformer', () => {
  it('parses components into the tree', () => {
    const md = `
## Test

<Example />
    `;
    const components = {
      Example: "## It's coming from within the component!",
    };

    const expected = h(
      undefined,
      h('h2', { id: 'test' }, 'Test'),
      '\n',
      h('h2', { id: 'its-coming-from-within-the-component' }, "It's coming from within the component!"),
    );

    expect(hast(md, { components })).toStrictEqualExceptPosition(expected);
  });

  it.only('parses html tags', () => {
    const md = '<h2>Nice</h2>';
    const tree = hast(md);
    expect(tree).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "children": [
              {
                "children": [
                  {
                    "position": {
                      "end": {
                        "column": 9,
                        "line": 1,
                        "offset": 8,
                      },
                      "start": {
                        "column": 5,
                        "line": 1,
                        "offset": 4,
                      },
                    },
                    "type": "text",
                    "value": "Nice",
                  },
                ],
                "position": {
                  "end": {
                    "column": 14,
                    "line": 1,
                    "offset": 13,
                  },
                  "start": {
                    "column": 1,
                    "line": 1,
                    "offset": 0,
                  },
                },
                "properties": {},
                "tagName": "div",
                "type": "element",
              },
            ],
            "position": {
              "end": {
                "column": 14,
                "line": 1,
                "offset": 13,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "properties": {},
            "tagName": "p",
            "type": "element",
          },
        ],
        "position": {
          "end": {
            "column": 14,
            "line": 1,
            "offset": 13,
          },
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
        },
        "type": "root",
      }
    `);
  });
});

describe('hastFromHtml', () => {
  it('parses html', () => {
    const html = '<div><span>Nice</span></div>';
    const tree = hastFromHtml(html);

    // @ts-ignore
    expect(tree.children[0].tagName).toBe('html');
    // @ts-ignore
    expect(tree.children[0].children[1].children[0].tagName).toBe('div');
    // @ts-ignore
    expect(tree.children[0].children[1].children[0].children[0].tagName).toBe('span');
  });
});
