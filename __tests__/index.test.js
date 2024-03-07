const { cleanup, render, screen } = require('@testing-library/react');
const React = require('react');

const BaseUrlContext = require('../contexts/BaseUrl');
const markdown = require('../index');
const { options } = require('../options');
const { tableFlattening } = require('../processor/plugin/table-flattening');

test('it should have the proper utils exports', () => {
  expect(typeof markdown.utils.BaseUrlContext).toBe('object');
  expect(typeof markdown.utils.GlossaryContext).toBe('object');
  expect(typeof markdown.utils.VariablesContext).toBe('object');

  expect(markdown.utils.options).toStrictEqual({
    alwaysThrow: false,
    compatibilityMode: false,
    copyButtons: true,
    correctnewlines: false,
    lazyImages: true,
    markdownOptions: {
      fences: true,
      commonmark: true,
      gfm: true,
      ruleSpaces: false,
      listItemIndent: '1',
      spacedTable: true,
      paddedTable: true,
    },
    normalize: true,
    reusableContent: {
      disabled: false,
      tags: {},
      serialize: true,
      wrap: true,
    },
    safeMode: false,
    settings: { position: true },
    theme: 'light',
  });
});

test('image', () => {
  const { container } = render(markdown.default('![Image](http://example.com/image.png)'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('heading', () => {
  const { container } = render(markdown.default('## Example Header'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('magic image', () => {
  const { container } = render(
    markdown.default(
      `
  [block:image]
  {
    "images": [
      {
        "image": [
          "https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg",
          "man-eating-pizza-and-making-an-ok-gesture.jpg",
          "",
          1024,
          682,
          "#d1c8c5"
        ],
        "caption": "A guy. Eating pizza. And making an OK gesture.",
        "sizing": "full",
        "align": "center"
      }
    ]
  }
  [/block]
  `,
      options
    )
  );

  expect(container.innerHTML).toMatchSnapshot();
});

test('list items', () => {
  const { container } = render(markdown.default('- listitem1'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('check list items', () => {
  const { container } = render(markdown.default('- [ ] checklistitem1\n- [x] checklistitem1'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('gemoji generation', () => {
  const { container } = render(markdown.default(':sparkles:'));
  expect(container.querySelector('.lightbox')).not.toBeInTheDocument();
});

test('should strip out inputs', () => {
  render(markdown.default('<input type="text" value="value" />'));
  expect(screen.queryByRole('input')).not.toBeInTheDocument();
});

test('tables', () => {
  const { container } = render(
    markdown.default(`| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebra stripes | are neat      |    $1 |
  `)
  );

  expect(container.innerHTML.trim()).toMatchSnapshot();
});

test('headings', () => {
  render(
    markdown.default(`# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`)
  );

  expect(screen.getAllByRole('heading')).toHaveLength(6);
});

test('anchors', () => {
  const { container } = render(
    markdown.default(`
[link](http://example.com)
[xss](javascript:alert)
[doc](doc:slug)
[ref](ref:slug)
[blog](blog:slug)
[changelog](changelog:slug)
[page](page:slug)
`)
  );

  expect(container.innerHTML).toMatchSnapshot();
});

test('anchor target: should default to _self', () => {
  const { container } = render(markdown.default('[test](https://example.com)'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('anchor target: should allow _blank if using HTML', () => {
  const { container } = render(markdown.default('<a href="https://example.com" target="_blank">test</a>'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('anchor target: should allow download if using HTML', () => {
  const { container } = render(markdown.default('<a download="example.png" href="" target="_blank">test</a>'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('anchors with baseUrl', () => {
  const { container } = render(
    React.createElement(
      BaseUrlContext.Provider,
      {
        value: '/child/v1.0',
      },
      markdown.html(
        `
[doc](doc:slug)
[ref](ref:slug)
[blog](blog:slug)
[changelog](changelog:slug)
[page](page:slug)
  `
      )
    )
  );

  expect(container.innerHTML).toMatchSnapshot();
});

test('anchors with baseUrl and special characters in url hash', () => {
  const { container } = render(markdown.default('[ref](ref:slug#整)'));
  expect(container.innerHTML).toMatchSnapshot();
});

test('emojis', () => {
  const { container } = render(
    markdown.default(`
:joy:
:fa-lock:
:unknown-emoji:
`)
  );

  expect(container.innerHTML).toMatchSnapshot();
});

describe('code samples', () => {
  it('should codify code', () => {
    const { container } = render(
      markdown.default(`
  \`\`\`javascript
  var a = 1;
  \`\`\`

  \`\`\`
  code-without-language
  \`\`\`
  `)
    );
    expect(container.querySelectorAll('pre')).toHaveLength(2);
    expect(container.querySelectorAll('button')).toHaveLength(3);
  });

  describe('`copyButtons` option', () => {
    it('should not insert the CopyCode component if `copyButtons=false`', () => {
      render(
        markdown.react('This is a sentence and it contains a piece of `code` wrapped in backticks.', {
          copyButtons: false,
        })
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  it('should parse indented code on the first line', () => {
    const md = '    const code = true;';
    expect(markdown.mdast(md)).toMatchSnapshot();
  });
});

test('should render nothing if nothing passed in', () => {
  expect(markdown.html('')).toBeNull();
});

test('`correctnewlines` option', () => {
  let { container } = render(markdown.react('test\ntest\ntest', { correctnewlines: true }));
  expect(container).toContainHTML('<p>test\ntest\ntest</p>');

  cleanup();

  ({ container } = render(markdown.react('test\ntest\ntest', { correctnewlines: false })));
  expect(container).toContainHTML('<p>test<br>\ntest<br>\ntest</p>');
});

describe('`alwaysThrow` option', () => {
  it('should throw if `alwaysThrow` is true and magic block has invalid JSON', () => {
    const shouldThrow = () =>
      render(
        markdown.default(
          `[block:api-header]
    {,
      "title": "Uh-oh, I'm invalid",
      "level": 2
    }
    [/block]`,
          { alwaysThrow: true }
        )
      );

    expect(shouldThrow).toThrow('Invalid Magic Block JSON');
  });

  it('should not throw if `alwaysThrow` is true but magic block has valid JSON', () => {
    const shouldThrow = () =>
      render(
        markdown.default(
          `[block:api-header]
    {
      "title": "Ooh I'm valid 💅",
      "level": 2
    }
    [/block]`,
          { alwaysThrow: true }
        )
      );

    expect(() => shouldThrow()).not.toThrow('Invalid Magic Block JSON');
  });
});

// TODO not sure if this needs to work or not?
// Isn't it a good thing to always strip HTML?
describe('`stripHtml` option', () => {
  it('should allow html by default', () => {
    expect(markdown.html('<p>Test</p>')).toBe('<p>Test</p>');
    expect(markdown.html('<p>Test</p>', { stripHtml: false })).toBe('<p>Test</p>');
  });

  it.skip('should escape unknown tags', () => {
    expect(markdown.html('<unknown-tag>Test</unknown-tag>')).toBe('<p>&lt;unknown-tag&gt;Test&lt;/unknown-tag&gt;</p>');
  });

  it('should allow certain attributes', () => {
    expect(markdown.html('<p id="test">Test</p>')).toBe('<p id="test">Test</p>');
  });

  it('should strip unknown attributes', () => {
    expect(markdown.html('<p unknown="test">Test</p>')).toBe('<p>Test</p>');
  });

  it.skip('should escape everything if `stripHtml=true`', () => {
    expect(markdown.html('<p>Test</p>', { stripHtml: true })).toBe('<p>&lt;p&gt;Test&lt;/p&gt;</p>\n');
  });
});

test('should strip dangerous iframe tag', () => {
  const { container } = render(markdown.react('<p><iframe src="javascript:alert(\'delta\')"></iframe></p>'));
  expect(container).toContainHTML('<p></p>');
});

test('should strip dangerous img attributes', () => {
  const { container } = render(markdown.default('<img src="x" onerror="alert(\'charlie\')">'));
  expect(container).not.toContainHTML('onerror');
});

describe('tree flattening', () => {
  it('should bring nested mdast data up to the top child level', () => {
    const text = `

|  | Col. B  |
|:-------:|:-------:|
| Cell A1 | Cell B1 |
| Cell A2 | Cell B2 |
| Cell A3 | |

    `;

    const hast = markdown.hast(text);
    const table = hast.children[1];

    expect(table.children).toHaveLength(2);
    expect(table.children[0].value).toBe('Col. B');
    expect(table.children[1].value).toBe('Cell A1 Cell B1 Cell A2 Cell B2 Cell A3');
  });

  it('should not throw an error if missing values', () => {
    const tree = {
      tagName: 'table',
      children: [
        {
          tagName: 'tHead',
        },
        {
          tagName: 'tBody',
        },
      ],
    };

    const [head, body] = tableFlattening(tree).children;
    expect(head.value).toBe('');
    expect(body.value).toBe('');
  });
});

describe('export multiple Markdown renderers', () => {
  const text = `# Hello World

  | Col. A  | Col. B  | Col. C  |
  |:-------:|:-------:|:-------:|
  | Cell A1 | Cell B1 | Cell C1 |
  | Cell A2 | Cell B2 | Cell C2 |
  | Cell A3 | Cell B3 | Cell C3 |

  [Embed Title](https://jsfiddle.net/rafegoldberg/5VA5j/ "@embed")

  > ❗️ UhOh
  >
  > Lorem ipsum dolor sit amet consectetur adipisicing elit.


  `;
  const tree = {
    type: 'root',
    children: [
      {
        type: 'heading',
        depth: 1,
        children: [
          {
            type: 'text',
            value: 'Hello World',
          },
        ],
      },
    ],
  };

  it('renders plain markdown as React', () => {
    expect(markdown.plain(text)).toMatchSnapshot();
  });

  it('renders custom React components', () => {
    expect(markdown.react(text)).toMatchSnapshot();
  });

  it('renders hAST', () => {
    expect(markdown.hast(text)).toMatchSnapshot();
  });

  it('renders mdAST', () => {
    expect(markdown.mdast(text)).toMatchSnapshot();
  });

  it('renders MD', () => {
    expect(markdown.md(tree)).toMatchSnapshot();
  });

  it('renders plainText from AST', () => {
    expect(markdown.astToPlainText(tree)).toMatchSnapshot();
  });

  it('astToPlainText should return an empty string if no value', () => {
    expect(markdown.astToPlainText()).toBe('');
  });

  it('allows complex compact headings', () => {
    const mdxt = `#Basic Text

##🙀 oh noes!
###**6**. Oh No

Lorem ipsum dolor!`;
    const html = markdown.html(mdxt);
    expect(html).toMatchSnapshot();
  });

  it('renders HTML', () => {
    expect(markdown.html(text)).toMatchSnapshot();
  });

  it('returns null for blank input', () => {
    expect(markdown.html('')).toBeNull();
    expect(markdown.plain('')).toBeNull();
    expect(markdown.react('')).toBeNull();
    expect(markdown.hast('')).toBeNull();
    expect(markdown.mdast('')).toBeNull();
    expect(markdown.md('')).toBeNull();
  });
});

describe('prefix anchors with "section-"', () => {
  it('should add a section- prefix to heading anchors', () => {
    expect(markdown.html('# heading')).toMatchSnapshot();
  });

  it('"section-" anchors should split on camelCased words', () => {
    const { container } = render(markdown.react('# camelCased'));
    const anchor = container.querySelectorAll('.heading-anchor_backwardsCompatibility')[0];

    expect(anchor).toHaveAttribute('id', 'section-camel-cased');
  });
});
