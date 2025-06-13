import { mdast } from '../../index';

describe('Parse RDMD Callouts', () => {
  it('renders an info callout', () => {
    const text = `
> 📘 Info Callout
>
> Lorem ipsum dolor  sit amet consectetur adipisicing elit.`;

    expect(mdast(text)).toMatchSnapshot();
  });

  it('parses a callout with no title', () => {
    const text = `
> ℹ️
>
> Lorem ipsum dolor  sit amet consectetur adipisicing elit.`;

    const tree = mdast(text);

    expect(tree.children[0].type).toBe('rdme-callout');
    expect(tree.children[0].data.hProperties.icon).toBe('ℹ️');
    expect(tree.children[0].data.hProperties.empty).toBe(true);
  });

  describe('edge cases', () => {
    it('renders html inside a callout', () => {
      const text = `
> ℹ️ Info Callout
>
> <span>With html!</span>
`;

      const tree = mdast(text);
      expect(tree.children[0].children[1].children[0].children[0].value).toBe('With html!');
      expect(tree.children[0].children[1].children[0].type).toBe('mdxJsxTextElement');
    });

    it('allows trailing spaces after the icon', () => {
      const text = `
> 🛑 
> Compact headings must be followed by two line breaks before the following block.`;

      const tree = mdast(text);
      expect(tree.children[0].data.hProperties.icon).toBe('🛑');
      expect(tree.children[0].children[0].children[0].value).toBe(
        'Compact headings must be followed by two line breaks before the following block.',
      );
    });
  });

  it('requires a space between the icon and title', () => {
    const text = `
> ℹ️Info Callout
>
> Lorem ipsum dolor  sit amet consectetur adipisicing elit.`;

    const tree = mdast(text);
    expect(tree.children[0].type).toBe('blockquote');
  });

  it('allows callouts nested in lists', () => {
    const text = `
- list item
  > ℹ️ Info Callout
  >
  > Lorem ipsum dolor  sit amet consectetur adipisicing elit.`;

    const tree = mdast(text);

    expect(tree.children[0].children[0].children[1].type).toBe('rdme-callout');
  });

  it('does require a line break between the title and the body', () => {
    const text = `
> 💁 Undocumented Behavior
> Lorem ipsum dolor  sit amet consectetur adipisicing elit.`;

    const tree = mdast(text);
    expect(tree.children[0].children[0].children[0].value).toBe(
      `Undocumented Behavior
Lorem ipsum dolor  sit amet consectetur adipisicing elit.`,
    );
  });
});

describe('emoji modifier support', () => {
  const emojis = ['📘', '🚧', '⚠️', '👍', '✅', '❗️', '❗', '🛑', '⁉️', '‼️', 'ℹ️', '⚠'];

  emojis.forEach(emoji => {
    it(`render a callout for ${emoji}`, () => {
      const text = `
> ${emoji}
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit.`;

      const ast = mdast(text);

      expect(ast.children[0].type).toBe('rdme-callout');
      expect(ast.children[0].data.hProperties.icon).toStrictEqual(emoji);
    });
  });
});
