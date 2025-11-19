import { mdx, mix } from '../../index';

describe('readme-to-mdx transformer', () => {
  it('converts a tutorial tile to MDX', () => {
    const ast = {
      type: 'root',
      children: [
        {
          type: 'tutorial-tile',
          backgroundColor: 'red',
          emoji: '🦉',
          id: 'test-id',
          link: 'http://example.com',
          slug: 'test-id',
          title: 'Test',
        },
      ],
    };

    expect(mdx(ast)).toMatchInlineSnapshot(`
      "<Recipe slug="test-id" title="Test" />
      "
    `);
  });
});

describe('mix readme-to-mdx transformer', () => {
  it.skip('converts a tutorial tile to MDX', () => {
    const ast = {
      type: 'root',
      children: [
        {
          type: 'tutorial-tile',
          backgroundColor: 'red',
          emoji: '🦉',
          id: 'test-id',
          link: 'http://example.com',
          slug: 'test-id',
          title: 'Test',
        },
      ],
    };

    expect(mix(ast)).toMatchInlineSnapshot(`
      "<Recipe slug="test-id" title="Test" />
      "
    `);
  });
});
