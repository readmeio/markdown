const markdown = require('../index');

test('a link with label', () => {
  expect(markdown.mdast('[link](http://www.foo.com)')).toMatchSnapshot();
});

test('a link with no url', () => {
  expect(markdown.mdast('[link]()')).toMatchSnapshot();
});

test('a link ref', () => {
  expect(markdown.mdast('[link]')).toMatchSnapshot();
});

test('a link ref with reference', () => {
  expect(markdown.mdast('[link]\n\n[link]: www.example.com')).toMatchSnapshot();
});

test('a bracketed autoLinked url', () => {
  expect(markdown.mdast('<http://www.google.com>')).toMatchSnapshot();
});

test('a bare autoLinked url', () => {
  expect(markdown.mdast('http://www.googl.com')).toMatchSnapshot();
});

test.skip('a bare autoLinked url with no protocol', () => {
  expect(markdown.mdast('www.google.com')).toMatchSnapshot();
});
