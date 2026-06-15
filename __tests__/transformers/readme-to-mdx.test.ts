import type { Recipe } from '../../types';
import type { Element } from 'hast';
import type { Root } from 'mdast';

import { mdast, mdx, mdxish } from '../../index';

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

  it('preserves Recipe attributes inside an Accordion round-trip', () => {
    const markdown = `<Accordion title="My Accordion" icon="fa-info-circle">
  <Recipe slug="recipe-title-1" title="Another One" />
</Accordion>`;

    const tree = mdast(markdown);
    const result = mdx(tree);

    expect(result).toMatchInlineSnapshot(`
      "<Accordion title="My Accordion" icon="fa-info-circle">
        <Recipe slug="recipe-title-1" title="Another One" />
      </Accordion>
      "
    `);
  });

  it('preserves mixed components inside an Accordion round-trip', () => {
    const markdown = `<Accordion title="My Accordion Title" icon="fa-info-circle">
  <Recipe slug="recipe-title-1" title="Another One" />

  <Image align="center" border={true} src="https://picsum.photos/200/300" width="80px" />

  <Anchor label="Testing Link" target="_blank" href="example.com">Testing Link</Anchor>

  <Callout icon="📘" theme="info">
    hi

    hias
  </Callout>

  <HTMLBlock>{\`
                          <h1>Hello</h1>
  \`}</HTMLBlock>

  <Embed typeOfEmbed="youtube" url="https://www.youtube.com/embed/dQw4w9WgXcQ?si=2dOm599qc8hFCXH5" />

  <Embed typeOfEmbed="pdf" url="https://www.orimi.com/pdf-test.pdf" />
</Accordion>`;

    const tree = mdast(markdown);
    const result = mdx(tree);

    expect(result).toMatchInlineSnapshot(`
      "<Accordion title="My Accordion Title" icon="fa-info-circle">
        <Recipe slug="recipe-title-1" title="Another One" />

        <Image align="center" border={true} src="https://picsum.photos/200/300" width="80px" />

        <Anchor label="Testing Link" target="_blank" href="example.com">Testing Link</Anchor>

        <Callout icon="📘" theme="info">
          hi

          hias
        </Callout>

        <HTMLBlock>{\`
                                  <h1>Hello</h1>
        \`}</HTMLBlock>

        <Embed typeOfEmbed="youtube" url="https://www.youtube.com/embed/dQw4w9WgXcQ?si=2dOm599qc8hFCXH5" />

        <Embed typeOfEmbed="pdf" url="https://www.orimi.com/pdf-test.pdf" />
      </Accordion>
      "
    `);
  });

  it('preserves multiple Recipes inside an Accordion round-trip', () => {
    const markdown = `<Accordion title="Recipes" icon="fa-book">
  <Recipe slug="first" title="First" />
  <Recipe slug="second" title="Second" />
</Accordion>`;

    const tree = mdast(markdown);
    const result = mdx(tree);

    expect(result).toMatchInlineSnapshot(`
      "<Accordion title="Recipes" icon="fa-book">
        <Recipe slug="first" title="First" />

        <Recipe slug="second" title="Second" />
      </Accordion>
      "
    `);
  });

  describe('Image', () => {
    describe('caption', () => {
      it('keeps a caption on a top-level Image', () => {
        const markdown = '<Image src="https://example.com/a.png" caption="A **bold** caption" />';
    
        const result = mdx(mdast(markdown));
    
        expect(result).toMatchInlineSnapshot(`
          "<Image src="https://example.com/a.png" caption="A **bold** caption" />
          "
        `);
      });
    
      it('keeps a caption on an Image nested inside components', () => {
        const markdown = `<Tabs>
  <Tab title="One">
    <Image src="https://example.com/a.png" caption="A caption" />
  </Tab>

  <Tab title="One"><Image src="https://example.com/a.png" caption="A caption" /></Tab>
</Tabs>`;
    
        const result = mdx(mdast(markdown));
    
        expect(result).toMatchInlineSnapshot(`
          "<Tabs>
            <Tab title="One">
              <Image src="https://example.com/a.png" caption="A caption" />
            </Tab>

            <Tab title="One">
              <Image src="https://example.com/a.png" caption="A caption" />
            </Tab>
          </Tabs>
          "
        `);
      });
    
      it('keeps both border and caption on a nested bordered Image', () => {
        const markdown = `<Tabs>
  <Tab title="One">
    <Image src="https://example.com/a.png" border={true} caption="Bordered caption" />
  </Tab>
</Tabs>`;
    
        const result = mdx(mdast(markdown));
    
        expect(result).toMatchInlineSnapshot(`
          "<Tabs>
            <Tab title="One">
              <Image border={true} src="https://example.com/a.png" caption="Bordered caption" />
            </Tab>
          </Tabs>
          "
        `);
      });
    
      it('does not emit an empty Image for an empty caption', () => {
        const markdown = '<Image src="https://example.com/a.png" caption="" />';
    
        const result = mdx(mdast(markdown));
    
        expect(result).toMatchInlineSnapshot(`
          "![](https://example.com/a.png)
          "
        `);
      });
    });
  })
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
