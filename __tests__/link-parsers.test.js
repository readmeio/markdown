import { mdast } from '../index';

test.skip('a link with label', () => {
  expect(mdast('[link](http://www.foo.com)')).toMatchSnapshot();
});

test.skip('a link with no url', () => {
  expect(mdast('[link]()')).toMatchSnapshot();
});

test.skip('a link ref', () => {
  expect(mdast('[link]')).toMatchSnapshot();
});

test.skip('a link ref with reference', () => {
  expect(mdast('[link]\n\n[link]: www.example.com')).toMatchSnapshot();
});

test.skip('a bracketed autoLinked url', () => {
  expect(mdast('<http://www.google.com>')).toMatchSnapshot();
});

test.skip('a bare autoLinked url', () => {
  expect(mdast('http://www.googl.com')).toMatchSnapshot();
});

test.skip('a bare autoLinked url with no protocol', () => {
  expect(mdast('www.google.com')).toMatchSnapshot();
});
