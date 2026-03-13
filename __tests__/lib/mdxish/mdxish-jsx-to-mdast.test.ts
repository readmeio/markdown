import type { Anchor, Callout, EmbedBlock, ImageBlock, Recipe } from '../../../types';
import type { Paragraph, Root } from 'mdast';

import { NodeTypes } from '../../../enums';
import { mdxishAstProcessor } from '../../../lib/mdxish';

describe('mdxish-jsx-to-mdast transformer', () => {
  describe('with newEditorTypes enabled', () => {
    const processWithNewTypes = (md: string): Root => {
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { newEditorTypes: true });
      return processor.runSync(processor.parse(parserReadyContent)) as Root;
    };

    describe('Image component', () => {
      it('should transform <Image /> to image-block node', () => {
        const md = '<Image src="test.png" alt="Test" />';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe(NodeTypes.imageBlock);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.data?.hProperties?.src).toBe('test.png');
        expect(imageNode.data?.hProperties?.alt).toBe('Test');
        expect(imageNode.data?.hName).toBe('img');
      });

      it('should preserve all Image attributes', () => {
        const md = '<Image src="test.png" alt="Test" align="center" border="true" width="300" height="200" />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.data?.hProperties).toMatchObject({
          src: 'test.png',
          alt: 'Test',
          align: 'center',
          border: 'true',
          width: '300',
          height: '200',
        });
      });

      it('should handle boolean border attribute', () => {
        const md = '<Image src="test.png" alt="Test" border />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.data?.hProperties?.border).toBe('true');
      });
    });

    describe('Callout component', () => {
      it('should transform <Callout> to rdme-callout node', () => {
        const md = `<Callout icon="📘" theme="info">
Content here
</Callout>`;
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe(NodeTypes.callout);

        const calloutNode = ast.children[0] as Callout;
        expect(calloutNode.data?.hProperties?.icon).toBe('📘');
        expect(calloutNode.data?.hProperties?.theme).toBe('info');
        expect(calloutNode.data?.hName).toBe('Callout');
      });

      it('should preserve Callout children', () => {
        const md = `<Callout icon="⚠️" theme="warning">
This is a warning message.
</Callout>`;
        const ast = processWithNewTypes(md);

        const calloutNode = ast.children[0] as Callout;
        expect(calloutNode.children).toBeDefined();
        expect(calloutNode.children.length).toBeGreaterThan(0);
      });
    });

    describe('Embed component', () => {
      it('should transform <Embed /> to embed-block node', () => {
        const md = '<Embed url="https://example.com" title="Example" />';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe(NodeTypes.embedBlock);

        const embedNode = ast.children[0] as EmbedBlock;
        expect(embedNode.data?.hProperties?.url).toBe('https://example.com');
        expect(embedNode.data?.hProperties?.title).toBe('Example');
        expect(embedNode.data?.hName).toBe('embed');
      });

      it('should preserve all Embed attributes', () => {
        const md = '<Embed url="https://youtube.com/watch?v=123" title="Video" providerName="YouTube" />';
        const ast = processWithNewTypes(md);

        const embedNode = ast.children[0] as EmbedBlock;
        expect(embedNode.data?.hProperties).toMatchObject({
          url: 'https://youtube.com/watch?v=123',
          title: 'Video',
          providerName: 'YouTube',
        });
      });

      it('should preserve typeOfEmbed attribute', () => {
        const md = '<Embed typeOfEmbed="youtube" url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />';
        const ast = processWithNewTypes(md);

        const embedNode = ast.children[0] as EmbedBlock;
        expect(embedNode.data?.hProperties?.typeOfEmbed).toBe('youtube');
        expect(embedNode.data?.hProperties?.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      });

      it('should preserve height and width attributes', () => {
        const md = '<Embed typeOfEmbed="iframe" url="https://example.com" height="400px" width="100%" />';
        const ast = processWithNewTypes(md);

        const embedNode = ast.children[0] as EmbedBlock;
        expect(embedNode.data?.hProperties).toMatchObject({
          typeOfEmbed: 'iframe',
          url: 'https://example.com',
          height: '400px',
          width: '100%',
        });
      });

      it('should preserve all embed types (github, pdf, jsfiddle)', () => {
        const testCases = [
          { type: 'github', url: 'https://gist.github.com/user/abc123' },
          { type: 'pdf', url: 'https://example.com/doc.pdf' },
          { type: 'jsfiddle', url: 'https://jsfiddle.net/user/abc123' },
        ];

        testCases.forEach(({ type, url }) => {
          const md = `<Embed typeOfEmbed="${type}" url="${url}" />`;
          const ast = processWithNewTypes(md);

          const embedNode = ast.children[0] as EmbedBlock;
          expect(embedNode.data?.hProperties?.typeOfEmbed).toBe(type);
          expect(embedNode.data?.hProperties?.url).toBe(url);
        });
      });
    });

    describe('Anchor component', () => {
      it('should transform <Anchor> to readme-anchor node', () => {
        const md = 'Start by <Anchor href="https://readme.com">ReadMe</Anchor> today.';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe('paragraph');

        const para = ast.children[0] as Paragraph;
        const anchorNode = para.children.find(c => c.type === NodeTypes.anchor) as Anchor;
        expect(anchorNode).toBeDefined();
        expect(anchorNode.data?.hProperties?.href).toBe('https://readme.com');
        expect(anchorNode.children[0]).toMatchObject({ type: 'text', value: 'ReadMe' });
      });

      it('should preserve target="_blank" on the Anchor node', () => {
        const md = '<Anchor label="**Guides**" target="_blank" href="https://docs.readme.com">Guides</Anchor>';
        const ast = processWithNewTypes(md);

        const para = ast.children[0] as Paragraph;
        const anchorNode = para.children.find(c => c.type === NodeTypes.anchor) as Anchor;
        expect(anchorNode).toBeDefined();
        expect(anchorNode.data?.hProperties?.href).toBe('https://docs.readme.com');
        expect(anchorNode.data?.hProperties?.target).toBe('_blank');
        expect(anchorNode.children[0]).toMatchObject({ type: 'text', value: 'Guides' });
      });

      it('should omit target when not provided', () => {
        const md = '<Anchor href="https://readme.com">ReadMe</Anchor>';
        const ast = processWithNewTypes(md);

        const para = ast.children[0] as Paragraph;
        const anchorNode = para.children.find(c => c.type === NodeTypes.anchor) as Anchor;
        expect(anchorNode).toBeDefined();
        expect(anchorNode.data?.hProperties?.href).toBe('https://readme.com');
        expect(anchorNode.data?.hProperties?.target).toBeUndefined();
      });

      it('should preserve title attribute', () => {
        const md = '<Anchor href="https://readme.com" title="Home">ReadMe</Anchor>';
        const ast = processWithNewTypes(md);

        const para = ast.children[0] as Paragraph;
        const anchorNode = para.children.find(c => c.type === NodeTypes.anchor) as Anchor;
        expect(anchorNode.data?.hProperties?.title).toBe('Home');
      });

      it('should handle empty Anchor children', () => {
        const md = '<Anchor href="https://readme.com"></Anchor>';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        const para = ast.children[0] as Paragraph;
        const anchorNode = para.children.find(c => c.type === NodeTypes.anchor) as Anchor;
        expect(anchorNode).toBeDefined();
        expect(anchorNode.data?.hProperties?.href).toBe('https://readme.com');
        expect(anchorNode.children).toHaveLength(0);
      });
    });

    describe('Recipe component', () => {
      it('should transform <Recipe /> to recipe node', () => {
        const md = '<Recipe slug="recipe-1" title="Recipe 1" />';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe(NodeTypes.recipe);

        const recipeNode = ast.children[0] as Recipe;
        expect(recipeNode.slug).toBe('recipe-1');
        expect(recipeNode.title).toBe('Recipe 1');
      });

      it('should preserve all Recipe attributes', () => {
        const md = '<Recipe slug="my-recipe" title="My Recipe" emoji="🍳" backgroundColor="#fff" />';
        const ast = processWithNewTypes(md);

        const recipeNode = ast.children[0] as Recipe;
        expect(recipeNode.slug).toBe('my-recipe');
        expect(recipeNode.title).toBe('My Recipe');
        expect(recipeNode.emoji).toBe('🍳');
        expect(recipeNode.backgroundColor).toBe('#fff');
      });
    });

    describe('unknown components', () => {
      it('should leave unknown components as mdxJsxFlowElement', () => {
        const md = '<CustomComponent prop="value" />';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe('mdxJsxFlowElement');
      });
    });

    describe('multiple components', () => {
      it('should transform multiple components in a document', () => {
        const md = `<Image src="test.png" alt="Test" />

<Recipe slug="recipe-1" title="Recipe 1" />`;
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(2);
        expect(ast.children[0].type).toBe(NodeTypes.imageBlock);
        expect(ast.children[1].type).toBe(NodeTypes.recipe);
      });
    });
  });

  describe('magic blocks', () => {
    const processWithNewTypes = (md: string): Root => {
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { newEditorTypes: true });
      return processor.runSync(processor.parse(parserReadyContent)) as Root;
    };

    it('should transform magic block image to image-block node', () => {
      // Magic block images are now transformed to 'image-block' type
      // Magic block image array format: [url, title, alt]
      const md = `[block:image]
{
  "images": [
    {
      "image": [
        "https://example.com/photo.jpg",
        "Image title",
        "Alt text"
      ],
      "align": "center"
    }
  ]
}
[/block]`;
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeTypes.imageBlock);

      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.src).toBe('https://example.com/photo.jpg');
      expect(imageNode.title).toBe('Image title');
      expect(imageNode.alt).toBe('Alt text');
      expect(imageNode.align).toBe('center');
      expect(imageNode.data?.hName).toBe('img');
      expect(imageNode.data?.hProperties?.src).toBe('https://example.com/photo.jpg');
    });

    it('should handle mix of magic blocks and JSX components', () => {
      // Both magic block images and JSX <Image /> become 'image-block' type
      const md = `[block:image]
{
  "images": [
    {
      "image": [
        "https://example.com/magic.jpg",
        "Magic image title",
        "Magic alt"
      ]
    }
  ]
}
[/block]

<Image src="https://example.com/jsx.jpg" alt="JSX image" />

<Callout icon="📘" theme="info">
Some callout content
</Callout>`;
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(3);
      expect(ast.children[0].type).toBe(NodeTypes.imageBlock); // Magic block becomes 'image-block'
      expect(ast.children[1].type).toBe(NodeTypes.imageBlock); // JSX becomes 'image-block'
      expect(ast.children[2].type).toBe(NodeTypes.callout);

      const magicImage = ast.children[0] as ImageBlock;
      expect(magicImage.src).toBe('https://example.com/magic.jpg');
      expect(magicImage.data?.hProperties?.src).toBe('https://example.com/magic.jpg');

      const jsxImage = ast.children[1] as ImageBlock;
      expect(jsxImage.data?.hProperties?.src).toBe('https://example.com/jsx.jpg');
    });

    it('should transform magic block embed to embed-block node', () => {
      const md = `[block:embed]
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "html": "<iframe></iframe>"
}
[/block]`;
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeTypes.embedBlock);

      const embedNode = ast.children[0] as EmbedBlock;
      expect(embedNode.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(embedNode.title).toBe('Never Gonna Give You Up');
      expect(embedNode.data?.hName).toBe('embed');
      expect(embedNode.data?.hProperties?.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should transform magic block recipe to recipe node', () => {
      const md = `[block:tutorial-tile]
{
  "slug": "my-recipe",
  "title": "My Recipe"
}
[/block]`;
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeTypes.recipe);

      const recipeNode = ast.children[0] as Recipe;
      expect(recipeNode.slug).toBe('my-recipe');
      expect(recipeNode.title).toBe('My Recipe');
    });

    it('should handle magic block callout (blockquote syntax)', () => {
      const md = `> 📘 Info Title
>
> This is callout content.`;
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeTypes.callout);

      const calloutNode = ast.children[0] as Callout;
      expect(calloutNode.data?.hProperties?.icon).toBe('📘');
      expect(calloutNode.data?.hProperties?.theme).toBe('info');
    });

    it('should transform magic block callout ([block:callout] syntax) to rdme-callout node', () => {
      const md = `[block:callout]
{
  "type": "info",
  "title": "Info Title",
  "body": "This is the callout body."
}
[/block]`;
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeTypes.callout);

      const calloutNode = ast.children[0] as Callout;
      expect(calloutNode.data?.hProperties?.icon).toBe('📘');
      expect(calloutNode.data?.hProperties?.theme).toBe('info');
      expect(calloutNode.data?.hName).toBe('Callout');
    });

    it('should handle basic markdown image', () => {
      const md = '![Alt text](https://example.com/image.jpg)';
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(1);
      // Basic markdown images become image-block via imageTransformer
      expect(ast.children[0].type).toBe(NodeTypes.imageBlock);

      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.src).toBe('https://example.com/image.jpg');
      expect(imageNode.alt).toBe('Alt text');
    });
  });

  describe('with newEditorTypes disabled (default)', () => {
    const processWithoutNewTypes = (md: string): Root => {
      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      return processor.runSync(processor.parse(parserReadyContent)) as Root;
    };

    it('should leave Image as mdxJsxFlowElement', () => {
      const md = '<Image src="test.png" alt="Test" />';
      const ast = processWithoutNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('mdxJsxFlowElement');
    });

    it('should leave Recipe as mdxJsxFlowElement', () => {
      const md = '<Recipe slug="recipe-1" title="Recipe 1" />';
      const ast = processWithoutNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('mdxJsxFlowElement');
    });

    it('should leave Anchor as raw html nodes (rendering path unaffected)', () => {
      const md = '<Anchor href="https://readme.com">ReadMe</Anchor>';
      const ast = processWithoutNewTypes(md);

      // Anchor is excluded from mdxishComponentBlocks so it stays as raw html nodes
      // inside the paragraph — no mdxJsxFlowElement is created
      expect(ast.children[0].type).toBe('paragraph');
      const para = ast.children[0] as Paragraph;
      const htmlNodes = para.children.filter(c => c.type === 'html');
      expect(htmlNodes.length).toBeGreaterThan(0);
      expect(para.children.find(c => c.type === 'mdxJsxFlowElement')).toBeUndefined();
    });
  });
});
