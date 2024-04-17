import { mdast, mdx } from '../../index';

describe('gemoji compiler', () => {
  it('should compile back to a shortcode', () => {
    const markdown = `This is a gemoji :joy:.`;

    expect(mdx(mdast(markdown)).trimEnd()).toEqual(markdown);
  });
});
