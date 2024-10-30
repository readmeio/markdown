import { mdast, mdx } from '../../index';

describe('gemoji compiler', () => {
  it('should compile back to a shortcode', () => {
    const markdown = `This is a gemoji :joy:.`;

    expect(mdx(mdast(markdown)).trimEnd()).toEqual(markdown);
  });

  it('should compile owlmoji back to a shortcode', () => {
    const markdown = `:owlbert:`;

    expect(mdx(mdast(markdown)).trimEnd()).toEqual(markdown);
  });

  it('should compile font-awsome emojis back to a shortcode', () => {
    const markdown = `:fa-readme:`;

    expect(mdx(mdast(markdown)).trimEnd()).toEqual(markdown);
  });
});
