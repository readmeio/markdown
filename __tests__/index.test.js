import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { Provider } from '../contexts/BaseUrl';
import { run, compile, utils, html as _html, mdast, hast as _hast, plain, mdx, astToPlainText } from '../index';
import { options } from '../options';
import { tableFlattening } from '../processor/plugin/table-flattening';

test.skip('it should have the proper utils exports', () => {
  expect(typeof utils.BaseUrlContext).toBe('object');
  expect(typeof utils.GlossaryContext).toBe('object');
  expect(typeof utils.VariablesContext).toBe('object');

  expect(options).toStrictEqual({
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
    safeMode: false,
    settings: { position: false },
    theme: 'light',
  });
});

test.skip('image', () => {
  const { container } = render(run(compile('![Image](http://example.com/image.png)')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('heading', () => {
  const { container } = render(run(compile('## Example Header')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('list items', () => {
  const { container } = render(run(compile('- listitem1')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('check list items', () => {
  const { container } = render(run(compile('- [ ] checklistitem1\n- [x] checklistitem1')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('gemoji generation', () => {
  const { container } = render(run(compile(':sparkles:')));
  expect(container.querySelector('.lightbox')).not.toBeInTheDocument();
});

test.skip('should strip out inputs', () => {
  render(run(compile('<input type="text" value="value" />')));
  expect(screen.queryByRole('input')).not.toBeInTheDocument();
});

test.skip('tables', () => {
  const { container } = render(
    run(
      compile(`| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebra stripes | are neat      |    $1 |
  `)
    )
  );

  expect(container.innerHTML.trim()).toMatchSnapshot();
});

test.skip('headings', () => {
  render(
    run(
      compile(`# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`)
    )
  );

  expect(screen.getAllByRole('heading')).toHaveLength(6);
});

test.skip('anchors', () => {
  const { container } = render(
    run(
      compile(`
[link](http://example.com)
[xss](javascript:alert)
[doc](doc:slug)
[ref](ref:slug)
[blog](blog:slug)
[changelog](changelog:slug)
[page](page:slug)
`)
    )
  );

  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('anchor target: should default to _self', () => {
  const { container } = render(run(compile('[test](https://example.com)')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('anchor target: should allow _blank if using HTML', () => {
  const { container } = render(run(compile('<a href="https://example.com" target="_blank">test</a>')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('anchor target: should allow download if using HTML', () => {
  const { container } = render(run(compile('<a download="example.png" href="" target="_blank">test</a>')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('anchors with baseUrl', () => {
  const { container } = render(
    createElement(
      Provider,
      {
        value: '/child/v1.0',
      },
      _html(
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

test.skip('anchors with baseUrl and special characters in url hash', () => {
  const { container } = render(run(compile('[ref](ref:slug#整)')));
  expect(container.innerHTML).toMatchSnapshot();
});

test.skip('emojis', () => {
  const { container } = render(
    markdown(`
:joy:
:fa-lock:
:unknown-emoji:
`)
  );

  expect(container.innerHTML).toMatchSnapshot();
});

describe.skip('code samples', () => {
  it('should codify code', () => {
    const { container } = render(
      markdown(`
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

  describe.skip('`copyButtons` option', () => {
    it('should not insert the CopyCode component if `copyButtons=false`', () => {
      render(
        run(
          compile('This is a sentence and it contains a piece of `code` wrapped in backticks.', {
            copyButtons: false,
          })
        )
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  it('should parse indented code on the first line', () => {
    const md = '    const code = true;';
    expect(mdast(md)).toMatchSnapshot();
  });
});

test.skip('should render nothing if nothing passed in', () => {
  expect(_html('')).toBeNull();
});

test.skip('`correctnewlines` option', () => {
  let { container } = render(react('test\ntest\ntest', { correctnewlines: true }));
  expect(container).toContainHTML('<p>test\ntest\ntest</p>');

  cleanup();

  ({ container } = render(react('test\ntest\ntest', { correctnewlines: false })));
  expect(container).toContainHTML('<p>test<br>\ntest<br>\ntest</p>');
});

describe.skip('`alwaysThrow` option', () => {
  it('should throw if `alwaysThrow` is true and magic block has invalid JSON', () => {
    const shouldThrow = () =>
      render(
        markdown(
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
        markdown(
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
describe.skip('`stripHtml` option', () => {
  it('should allow html by default', () => {
    expect(_html('<p>Test</p>')).toBe('<p>Test</p>');
    expect(_html('<p>Test</p>', { stripHtml: false })).toBe('<p>Test</p>');
  });

  it.skip('should escape unknown tags', () => {
    expect(_html('<unknown-tag>Test</unknown-tag>')).toBe('<p>&lt;unknown-tag&gt;Test&lt;/unknown-tag&gt;</p>');
  });

  it('should allow certain attributes', () => {
    expect(_html('<p id="test">Test</p>')).toBe('<p id="test">Test</p>');
  });

  it('should strip unknown attributes', () => {
    expect(_html('<p unknown="test">Test</p>')).toBe('<p>Test</p>');
  });

  it.skip('should escape everything if `stripHtml=true`', () => {
    expect(_html('<p>Test</p>', { stripHtml: true })).toBe('<p>&lt;p&gt;Test&lt;/p&gt;</p>\n');
  });
});

test.skip('should strip dangerous iframe tag', () => {
  const { container } = render(run(compile('<p><iframe src="javascript:alert(\'delta\')"></iframe></p>')));
  expect(container).toContainHTML('<p></p>');
});

test.skip('should strip dangerous img attributes', () => {
  const { container } = render(run(compile('<img src="x" onerror="alert(\'charlie\')">')));
  expect(container).toContainHTML(
    '<span aria-label="" class="img lightbox closed" role="button" tabindex="0"><span class="lightbox-inner"><img src="x" align="" alt="" caption="" height="auto" title="" width="auto" loading="lazy"></span></span>'
  );
});

describe.skip('tree flattening', () => {
  it('should bring nested mdast data up to the top child level', () => {
    const text = `

|  | Col. B  |
|:-------:|:-------:|
| Cell A1 | Cell B1 |
| Cell A2 | Cell B2 |
| Cell A3 | |

    `;

    const hast = _hast(text);
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

describe.skip('export multiple Markdown renderers', () => {
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
    expect(plain(text)).toMatchSnapshot();
  });

  it('renders custom React components', () => {
    expect(run(compile(text))).toMatchSnapshot();
  });

  it('renders hAST', () => {
    expect(_hast(text)).toMatchSnapshot();
  });

  it('renders mdAST', () => {
    expect(mdast(text)).toMatchSnapshot();
  });

  it('renders MD', () => {
    expect(mdx(tree)).toMatchSnapshot();
  });

  it.skip('renders plainText from AST', () => {
    expect(astToPlainText(tree)).toMatchSnapshot();
  });

  it.skip('astToPlainText should return an empty string if no value', () => {
    expect(astToPlainText()).toBe('');
  });

  it('allows complex compact headings', () => {
    const mdxt = `#Basic Text

##🙀 oh noes!
###**6**. Oh No

Lorem ipsum dolor!`;
    const html = _html(mdxt);
    expect(html).toMatchSnapshot();
  });

  it('renders HTML', () => {
    expect(_html(text)).toMatchSnapshot();
  });

  it('returns null for blank input', () => {
    expect(_html('')).toBeNull();
    expect(plain('')).toBeNull();
    expect(run(compile(''))).toBeNull();
    expect(_hast('')).toBeNull();
    expect(mdast('')).toBeNull();
    expect(mdx('')).toBeNull();
  });
});

describe.skip('prefix anchors with "section-"', () => {
  it('should add a section- prefix to heading anchors', () => {
    expect(_html('# heading')).toMatchSnapshot();
  });

  it('"section-" anchors should split on camelCased words', () => {
    const { container } = render(run(compile('# camelCased')));
    const anchor = container.querySelectorAll('.heading-anchor_backwardsCompatibility')[0];

    expect(anchor).toHaveAttribute('id', 'section-camel-cased');
  });
});
