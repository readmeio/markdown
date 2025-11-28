import type { Recipe } from '../../types';
import type { Element } from 'hast';
import type { Root } from 'mdast';

import { mdx, mdxish } from '../../index';

describe('readme-to-mdx transformer', () => {
  it('converts a tutorial tile to MDX', () => {
    const ast: Root = {
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
        } as Recipe,
      ],
    };

    expect(mdx(ast)).toMatchInlineSnapshot(`
      "<Recipe slug="test-id" title="Test" />
      "
    `);
  });
});

describe('mdxish readme-to-mdx transformer', () => {
  it('processes Recipe component', () => {
    const markdown = '<Recipe slug="test-id" title="Test" />';

    const hast = mdxish(markdown);
    const recipe = hast.children[0] as Element;

    expect(recipe.type).toBe('element');
    expect(recipe.tagName).toBe('Recipe');
    expect(recipe.properties.slug).toBe('test-id');
    expect(recipe.properties.title).toBe('Test');
  });
});
