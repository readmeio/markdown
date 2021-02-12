const markdown = require('../index');

describe('tokenizerSet: "blocks"', () => {
  const opts = { tokenizerSet: 'blocks' };

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

describe('tokenizerSet: "inlines"', () => {
  const opts = { tokenizerSet: 'inlines' };

  it('disabling block tokenizer', () => {
    const md = '# heading 1';
    expect(markdown.mdast(md, opts)).toMatchSnapshot();
  });
});
