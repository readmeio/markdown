import type { Callout, EmbedBlock, ImageBlock, Recipe } from '../../../types';
import type { Root } from 'mdast';

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
  });
});
