const { defaultSchema: sanitize } = require('hast-util-sanitize/lib/schema');
const rehypeSanitize = require('rehype-sanitize');
const remarkParse = require('remark-parse');
const remarkStringify = require('remark-stringify');
const unified = require('unified');

const parsers = Object.values(require('../processor/parse')).map(parser => parser.sanitize?.(sanitize) || parser);
const compilers = Object.values(require('../processor/compile'));
const options = require('../options').options.markdownOptions;

const processor = unified()
  .use(remarkParse, options)
  .data('settings', { position: false })
  .use(parsers)
  .use(rehypeSanitize);

const parse = text => text && processor().parse(text);
const compile = tree => tree && processor().use(remarkStringify, options).use(compilers).stringify(tree);

describe('ReadMe Flavored Blocks', () => {
  it('Embed', () => {
    const txt = '[Embedded meta links.](https://nyti.me/s/gzoa2xb2v3 "@nyt")';
    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchSnapshot();
  });

  it('Variables', () => {
    expect(compile(parse('<<variable:user>>'))).toMatchInlineSnapshot(`
      "<<variable:user>>
      "
    `);
  });

  it('Glossary Items', () => {
    expect(compile(parse('<<glossary:owl>>'))).toMatchInlineSnapshot(`
      "<<glossary:owl>>
      "
    `);
  });

  it('Emojis', () => {
    expect(compile(parse(':smiley:'))).toMatchInlineSnapshot(`
      ":smiley:
      "
    `);
  });

  it('Html Block', () => {
    const text = `
[block:html]
{
  "html": ${JSON.stringify(
    '<style>\n  summary {\n    padding-top: 8px;\n    outline: none !important;\n    user-select: none;\n  }\n  details[open] + details > summary {\n    padding-top: 0;\n  }\n  details > summary + hr {\n    opacity: .66;\n  }\n</style>',
  )}
}
[/block]
`;
    const ast = parse(text);

    expect(compile(ast)).toMatchInlineSnapshot(`
      "[block:html]
      {
        \\"html\\": \\"<style>\\\\n  summary {\\\\n    padding-top: 8px;\\\\n    outline: none !important;\\\\n    user-select: none;\\\\n  }\\\\n  details[open] + details > summary {\\\\n    padding-top: 0;\\\\n  }\\\\n  details > summary + hr {\\\\n    opacity: .66;\\\\n  }\\\\n</style>\\"
      }
      [/block]
      "
    `);
  });
});

describe('ReadMe Magic Blocks', () => {
  it('Embed', () => {
    const txt = `[block:embed]
    {
      "html": false,
      "url": "https://youtu.be/J3-uKv1DShQ",
      "title": null,
      "favicon": "https://youtu.be/favicon.ico"
    }
    [/block]`;
    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchSnapshot();
  });

  it('Code Tabs', () => {
    const txt = `[block:code]
    {
      "codes": [
        {
          "code": "console.log('a multi-file code block');",
          "language": "javascript",
          "name": "multiple.js"
        },
        {
          "code": "console.log('an unnamed sample snippet');",
          "language": "javascript"
        }
      ]
    }
    [/block]
    `;
    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchSnapshot();
  });

  it('Callouts', () => {
    const txt = `[block:callout]
    {
      "type": "success",
      "title": "Success",
      "body": "Vitae reprehenderit at aliquid error voluptates eum dignissimos."
    }
    [/block]

    And this is a paragraph!
    `;
    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchSnapshot();
  });

  it('Figure', () => {
    const txt = `[block:image]
    {
      "images": [
        {
          "image": [
            "https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg",
            "rdme-blue.svg"
          ],
          "caption": "Ok, __pizza__ man.",
          "sizing": "80"
        }
      ]
    }
    [/block]`;
    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchSnapshot();
  });

  it('Figure with alt text', () => {
    const txt = `[block:image]
    {
      "images": [
        {
          "image": [
            "https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg",
            "rdme-blue.svg",
            "A man eating pizza and making an OK gesture"
          ],
          "caption": "Ok, __pizza__ man.",
          "sizing": "80"
        }
      ]
    }
    [/block]`;
    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchSnapshot();
  });

  it('Image', () => {
    const txt = `[block:image]
    {
       "images": [{
          "image": [
            "https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg",
            "rdme-blue.svg"
          ]
       }]
    }
    [/block]`;
    const ast = parse(txt);
    const out = compile(ast);

    expect(out).toMatchSnapshot();
  });

  it('Image with sizing and border', () => {
    const txt = `[block:image]
    {
       "images": [{
          "image": [
            "https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg",
            "rdme-blue.svg"
          ],
          "sizing": "80px",
          "border": true
       }]
    }
    [/block]`;
    const ast = parse(txt);
    const out = compile(ast);

    expect(out).toMatchSnapshot();
  });

  it('Image with sizing and alignment', () => {
    const txt = `[block:image]
    {
       "images": [{
          "image": [
            "https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg",
            "rdme-blue.svg"
          ],
          "sizing": "80px",
          "align": "right"
       }]
    }
    [/block]`;
    const ast = parse(txt);
    const out = compile(ast);

    expect(out).toMatchSnapshot();
  });

  it('custom blocks', () => {
    const txt = `
[block:tutorial-tile]
${JSON.stringify(
  {
    backgroundColor: '#ffffff',
    title: 'Tutorial Title',
    emoji: '🦉',
    link: 'http://test.com',
  },
  null,
  2,
)}
[/block]

    `;

    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchSnapshot();
  });

  it('font-awesome emojis', () => {
    const txt = ':fa-rss-square:';

    const ast = parse(txt);
    const out = compile(ast);
    expect(out).toMatchInlineSnapshot(`
      ":fa-rss-square:
      "
    `);
  });

  it('Tables', () => {
    const md = `
[block:parameters]
${JSON.stringify({
  data: {
    'h-0': 'th 1',
    'h-1': 'th 2',
    '0-0': 'cell 1',
    '0-1': 'cell 2',
  },
  cols: 2,
  rows: 1,
  align: ['center', 'center'],
})}
[/block]
    `;

    expect(compile(parse(md))).toMatchSnapshot();
  });

  it('Tables with breaks', () => {
    const md = `
[block:parameters]
${JSON.stringify({
  data: {
    'h-0': 'th 1',
    'h-1': 'th 2',
    '0-0': 'cell 1  \nafter the break',
    '0-1': 'cell 2',
  },
  cols: 2,
  rows: 1,
  align: ['center', 'center'],
})}
[/block]
    `;

    expect(compile(parse(md))).toMatchSnapshot();
  });
});
