const markdown = require('../index');

describe('disableTokenizers: "inlines"', () => {
  const opts = { disableTokenizers: 'inlines' };

  it('disabling inlineCode', () => {
    const md = '`const js = true `';
    expect(markdown.mdast(md, opts)).toMatchSnapshot();
  });

  it('disabling emphasis', () => {
    const md = '*emphatic **strong** emphatic*';
    expect(markdown.mdast(md, opts)).toMatchSnapshot();
  });

  it('disabling delete', () => {
    const md = '~~strikethrough~~';
    expect(markdown.mdast(md, opts)).toMatchSnapshot();
  });
});

describe('disableTokenizers: "blocks"', () => {
  const opts = { disableTokenizers: 'blocks' };

  it('disabling block tokenizer', () => {
    const md = '# heading 1';
    expect(markdown.mdast(md, opts)).toMatchSnapshot();
  });
});

describe('disableTokenizers: {}', () => {
  it('disables a block tokenizer', () => {
    const opts = { disableTokenizers: { block: ['atxHeading'] } };
    const md = '# heading 1';
    expect(markdown.mdast(md, opts)).toMatchSnapshot();
  });

  it('disables an inline tokenizer', () => {
    const opts = { disableTokenizers: { inline: ['code'] } };
    const md = '`const js = true`';
    expect(markdown.mdast(md, opts)).toMatchSnapshot();
  });
});
