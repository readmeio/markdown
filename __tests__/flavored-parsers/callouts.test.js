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

  describe('emoji support', () => {
    const emojis = ['🛈', '✎', '🗹', '🗐', 'ℹ'];

    emojis.forEach(emoji => {
      it(`render a callout for ${emoji}`, () => {
        const text = `
> ${emoji} Default Callout
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit.`;

        expect(mdast(text)).toMatchSnapshot();
      });
    });
  });
});
