import { mdast } from '../index';

describe('Parse RDMD Syntax', () => {
  describe('Code Blocks', () => {
    it('Tabbed Code Block', () => {
      const text =
        "\n\n```javascript multiple.js\nconsole.log('a multi-file code block');\n```\n```javascript\nconsole.log('an unnamed sample snippet');\n```\n\n&nbsp;";
      const ast = mdast(text);
      expect(ast).toMatchSnapshot();
    });

    it('Single Code Block', () => {
      const text = "\n\n```javascript single.js\nconsole.log('a single-file code block');\n```\n\n";
      const ast = mdast(text);
      expect(ast).toMatchSnapshot();
    });

    it('allows indented code', () => {
      const mdx = `
\`\`\`
  const shouldBeIndented = true;
  if (shouldBeIndented) pass();
\`\`\`
`;
      expect(mdast(mdx)).toMatchSnapshot();
    });

    it.skip('parses indented code blocks', () => {
      const mdx = `

    const shouldBeIndented = true;
    if (shouldBeIndented) pass();

`;
      const ast = mdast(mdx);

      expect(ast.children[0].type).toBe('code');
      expect(ast).toMatchSnapshot();
    });

    describe('Edge Cases', () => {
      it('Code blocks should elide spaces before meta data', () => {
        /**
         * https://github.com/readmeio/api-explorer/issues/722
         */
        const mdx = '```    js Tab Name\nconsole.log("test zed");\n```';
        const ast = mdast(mdx);
        const [codeBlock] = ast.children;

        expect(codeBlock.type).toBe('code');
        expect(codeBlock.meta).toBe('Tab Name');
        expect(codeBlock.lang).toBe('js');
      });

      it('Code blocks should keep spaces entered at start of first line', () => {
        const mdx =
          "```javascript tab/a.js\n  function sayHello (state) {\n    console.log(state);\n  }\n\nexport default sayHello;\n```\n```javascript tab/b.js\nimport A from './a.js';\n\nA('Hello world!');\n```\n\n";
        const ast = mdast(mdx);

        expect(ast).toMatchSnapshot();
      });

      it('Code blocks should use a "smart" terminating delimiter', () => {
        /**
         * https://github.com/readmeio/api-explorer/issues/724
         */
        const mdx = '```bash\ndash-cli -testnet keepass genkey\n``` ';
        const ast = mdast(mdx);
        const [codeBlock] = ast.children;
        expect(codeBlock.type).toBe('code');
        expect(ast.children).toHaveLength(1);
      });

      it.skip('Handles triple backticks within a code block', () => {
        const mdx = '```\nconsole.log("why would you do this?!```");\n```\n```\nbar\n```';
        const ast = mdast(mdx);

        expect(ast.children[0].children).toHaveLength(2);
      });

      it.skip('Tabbed code blocks should allow internal new lines', () => {
        const mdx =
          "```javascript tab/a.js\nfunction sayHello (state) {\n  console.log(state);\n}\n\nexport default sayHello;\n```\n```javascript tab/b.js\nimport A from './a.js';\n\nA('Hello world!');\n```\n\n";
        const ast = mdast(mdx);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe('code-tabs');
      });

      it.skip('Tabbed code blocks should not require meta data to be specified', () => {
        /**
         * https://github.com/readmeio/api-explorer/issues/719
         */
        const mdx = '```\nwill break\n```\n```\nthe page!\n```';
        const ast = mdast(mdx);
        const [codeTabs] = ast.children;
        expect(codeTabs.children).toHaveLength(2);
      });

      it.skip('Tabbed code blocks should not require any code', () => {
        const mdx = '```c++ oh me\nsome code\n```\n```c++ a tab with no code\n```\n```c++ oh my\nsome more\n```';
        const ast = mdast(mdx);
        const [codeTabs] = ast.children;
        expect(codeTabs.children).toHaveLength(3);
      });

      it.skip('Multiple empty code blocks tabs should render', () => {
        const mdx = '```\n```\n```\n```';
        const ast = mdast(mdx);
        const [codeTabs] = ast.children;
        expect(codeTabs.children).toHaveLength(2);
      });
    });
  });

  it('Subsequent, non-adjacent code should render as single blocks.', () => {
    const mdx =
      "```javascript single.js\nconsole.log('a single-file code block');\n```\n\n```javascript single.js\nconsole.log('a single-file code block');\n```";
    const ast = mdast(mdx);
    expect(ast.children).toHaveLength(2);
    expect(ast.children.map(node => node.type)).toStrictEqual(['code', 'code']);
  });

  it('When fools just, like, totally disregard newlines...', () => {
    // See this comment for more...
    // https://github.com/readmeio/api-explorer/pull/627#discussion_r415420860
    const mdx =
      "\n\n```javascript single.js\nconsole.log('I should be a single code block');\n```\n## I Should be an H3 Tag\n```javascript single.js\nconsole.log('I\\'m also a single code block');\n```\n\n";
    const ast = mdast(mdx);
    expect(ast.children).toHaveLength(3);
  });

  it('More foolish disregard for newlines.', () => {
    const mdx = '```\nfoo\n```\nOops\n```\nbar\n```';
    const ast = mdast(mdx);

    expect(ast.children.map(c => c.type)).toStrictEqual(['code', 'paragraph', 'code']);
  });

  it('Inappropriate leading whitespace is not matched.', () => {
    const mdx = '```\nfoo\n  ```\nOops\n```\nbar\n```';
    const ast = mdast(mdx);

    expect(ast.children.map(c => c.type)).toStrictEqual(['code', 'paragraph', 'code']);
  });

  it.skip('Allows trailing text on a closing fence.', () => {
    const mdx = '```\nfoo\n```\n```\nbar\n``` Oops';
    const ast = mdast(mdx);

    expect(ast.children.map(c => c.type)).toStrictEqual(['code-tabs', 'paragraph']);
  });

  it.skip('is not stateful', () => {
    const mdx = '```\n"Dont forget that RegExp.prototype.exec is statefule"\n```\n```\nbar\n```';
    let ast = mdast(mdx);
    expect(ast.children.map(c => c.type)).toStrictEqual(['code-tabs']);

    ast = mdast(mdx);
    expect(ast.children.map(c => c.type)).toStrictEqual(['code-tabs']);
  });
});
