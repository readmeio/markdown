import { mdast } from '../../../../lib';

describe('convert variable tag', () => {
  it('wraps root-level Variable in a paragraph', () => {
    const mdx = '<Variable name="username" />';

    expect(mdast(mdx)).toMatchSnapshot();
  });

  it('does not double-wrap Variable already inside a paragraph', () => {
    const mdx = 'Hello <Variable name="username" />';

    expect(mdast(mdx)).toMatchSnapshot();
  });
});
