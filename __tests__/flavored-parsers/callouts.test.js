import { mdast } from '../../index';

describe('Parse RDMD Callouts', () => {
  it('renders an info callout', () => {
    const text = `
> ℹ️ Info Callout
>
> Lorem ipsum dolor  sit amet consectetur adipisicing elit.`;

    expect(mdast(text)).toMatchSnapshot();
  });

  describe('edge cases', () => {
    it('renders html inside a callout', () => {
      const text = `
> ℹ️ Info Callout
>
> <span>With html!</span>
`;

      expect(mdast(text)).toMatchSnapshot();
    });
  });

  it('requires a space between the icon and title', () => {
    const text = `
> ℹ️Info Callout
>
> Lorem ipsum dolor  sit amet consectetur adipisicing elit.`;
    expect(mdast(text)).toMatchSnapshot();
  });
});

describe('emoji modifier support', () => {
  const emojis = ['📘', '⚠️', '🚧', '👍', '✅', '❗', '❗️', '🛑', '⁉️', '‼️', 'ℹ️', '⚠'];

  emojis.forEach(emoji => {
    it(`render a callout for ${emoji}`, () => {
      const text = `
> ${emoji}
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit.`;
      const ast = mdast(text);
      expect(ast).toMatchSnapshot();
      expect(ast.children[0].data.hProperties.title).toBe('');
    });
  });
});
