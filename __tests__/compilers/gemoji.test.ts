import { mdast, mdx, mix } from '../../index';

describe('gemoji compiler', () => {
  it('should compile back to a shortcode', () => {
    const markdown = 'This is a gemoji :joy:.';

    expect(mdx(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });

  it('should compile owlmoji back to a shortcode', () => {
    const markdown = ':owlbert:';

    expect(mdx(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });

  it('should compile font-awsome emojis back to a shortcode', () => {
    const markdown = ':fa-readme:';

    expect(mdx(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });
});

describe('mix gemoji compiler', () => {
  it.skip('should compile back to a shortcode', () => {
    const markdown = 'This is a gemoji :joy:.';

    expect(mix(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });

  it.skip('should compile owlmoji back to a shortcode', () => {
    const markdown = ':owlbert:';

    expect(mix(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });

  it.skip('should compile font-awsome emojis back to a shortcode', () => {
    const markdown = ':fa-readme:';

    expect(mix(mdast(markdown)).trimEnd()).toStrictEqual(markdown);
  });
});
