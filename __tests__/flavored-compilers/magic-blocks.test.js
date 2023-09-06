import { md, mdast } from '../../index';

describe('Compile Magic Blocks', () => {
  it('compiles a magic block to multiple lines', () => {
    const text = `
[block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]
`;
    const tree = mdast(text);
    const compiled = md(tree);

    expect(compiled).toMatchInlineSnapshot(`
      "[block:image]
      {
        \\"images\\": [
          {
            \\"image\\": [
              \\"https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png\\",
              \\"\\",
              \\"\\"
            ],
            \\"align\\": \\"center\\"
          }
        ]
      }
      [/block]
      "
    `);
  });

  it('compiles a magic block in a container on a single line', () => {
    const text = `
> 👍 It works!
>
> [block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]
`;
    const tree = mdast(text);
    const compiled = md(tree);

    expect(compiled).toMatchInlineSnapshot(`
      "> 👍 It works!
      > 
      > [block:image]{\\"images\\":[{\\"image\\":[\\"https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png\\",\\"\\",\\"\\"],\\"align\\":\\"center\\"}]}[/block]
      "
    `);
  });

  it('compiles two adjacent magic blocks', () => {
    const text = `
[block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]

[block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]
`;
    const tree = mdast(text);
    const compiled = md(tree);

    expect(compiled).toMatchInlineSnapshot(`
      "[block:image]
      {
        \\"images\\": [
          {
            \\"image\\": [
              \\"https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png\\",
              \\"\\",
              \\"\\"
            ],
            \\"align\\": \\"center\\"
          }
        ]
      }
      [/block]


      [block:image]
      {
        \\"images\\": [
          {
            \\"image\\": [
              \\"https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png\\",
              \\"\\",
              \\"\\"
            ],
            \\"align\\": \\"center\\"
          }
        ]
      }
      [/block]
      "
    `);
  });
});
