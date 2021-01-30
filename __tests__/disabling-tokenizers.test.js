const markdown = require('../index');

test('disabling inlineCode', () => {
  const md = '`const js = true `';
  const opts = { disableTokenizers: { inline: ['code'] } };

  expect(markdown.mdast(md, opts)).toMatchSnapshot();
});

test('disabling emphasis', () => {
  const md = '*emphatic **strong** emphatic*';
  const opts = { disableTokenizers: { inline: ['emphasis', 'strong'] } };

  expect(markdown.mdast(md, opts)).toMatchSnapshot();
});

test('disabling block tokenizer', () => {
  const md = '# heading 1';
  const opts = { disableTokenizers: { block: ['atxHeading'] } };

  expect(markdown.mdast(md, opts)).toMatchSnapshot();
});
