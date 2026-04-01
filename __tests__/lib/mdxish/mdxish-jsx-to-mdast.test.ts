import type { Anchor, Callout, EmbedBlock, ImageBlock, Recipe, Variable } from '../../../types';
import type { Root as HastRoot } from 'hast';
import type { Paragraph, Root, RootContent } from 'mdast';

import { NodeTypes } from '../../../enums';
import { mdxish, mdxishAstProcessor } from '../../../lib/mdxish';

describe('mdxish-jsx-to-mdast transformer', () => {
  const processWithNewTypes = (md: string): Root => {
    const { processor, parserReadyContent } = mdxishAstProcessor(md, { newEditorTypes: true });
    return processor.runSync(processor.parse(parserReadyContent)) as Root;
  };

  describe('with newEditorTypes enabled', () => {

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
          border: true,
          sizing: '300',
          width: '300',
          height: '200',
        });
        expect(imageNode.align).toBe('center');
        expect(imageNode.sizing).toBe('300');
      });

      it('should validate align to a known ImageAlign value', () => {
        const md = '<Image src="test.png" alt="Test" align="invalid" />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.align).toBeUndefined();
        expect(imageNode.data?.hProperties?.align).toBeUndefined();
      });

      it('should map width to sizing on the node', () => {
        const md = '<Image src="test.png" alt="Test" width="50%" />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.sizing).toBe('50%');
        expect(imageNode.width).toBe('50%');
        expect(imageNode.data?.hProperties?.sizing).toBe('50%');
      });

      it('should handle boolean border attribute', () => {
        const md = '<Image src="test.png" alt="Test" border />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.data?.hProperties?.border).toBe(true);
        expect(imageNode.border).toBe(true);
      });

      it('should normalize border="false" to boolean false', () => {
        const md = '<Image src="test.png" alt="Test" border="false" />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.border).toBe(false);
        expect(imageNode.data?.hProperties?.border).toBe(false);
      });

      it('should leave border undefined when not specified', () => {
        const md = '<Image src="test.png" alt="Test" />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.border).toBeUndefined();
        expect(imageNode.data?.hProperties?.border).toBeUndefined();
      });

      it('should parse caption with markdown and HTML entities into children', () => {
        const md = '<Image src="test.png" alt="test" caption="With **Default Handling** enabled, the `default` value &#x22;Buster&#x22; is used." />';
        const ast = processWithNewTypes(md);

        const imageNode = ast.children[0] as ImageBlock;
        expect(imageNode.caption).toBe('With **Default Handling** enabled, the `default` value &#x22;Buster&#x22; is used.');
        expect(imageNode.children).toHaveLength(1);

        const paragraph = imageNode.children[0] as Paragraph;
        expect(paragraph.type).toBe('paragraph');
        expect(paragraph.children[0]).toMatchObject({ type: 'text', value: 'With ' });
        expect(paragraph.children[1]).toMatchObject({ type: 'strong' });
        expect(paragraph.children[3]).toMatchObject({ type: 'inlineCode', value: 'default' });
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

    describe('Variable component', () => {
      it('should transform <Variable /> to readme-variable node', () => {
        const md = 'Hello <Variable name="USERNAME" />, welcome!';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        expect(ast.children[0].type).toBe('paragraph');

        const para = ast.children[0] as Paragraph;
        const variableNode = para.children.find(c => c.type === NodeTypes.variable) as Variable;
        expect(variableNode).toBeDefined();
        expect(variableNode.data?.hProperties?.name).toBe('USERNAME');
        expect(variableNode.data?.hName).toBe('Variable');
      });

      it('should handle "variable" attribute as alternate to "name"', () => {
        const md = 'Your API key is <Variable variable="API_KEY" />.';
        const ast = processWithNewTypes(md);

        const para = ast.children[0] as Paragraph;
        const variableNode = para.children.find(c => c.type === NodeTypes.variable) as Variable;
        expect(variableNode).toBeDefined();
        expect(variableNode.data?.hProperties?.name).toBe('API_KEY');
      });

      it('should prefer "name" attribute over "variable" when both present', () => {
        // Variable alone on a line becomes a flow element (top-level node)
        const md = '<Variable name="PREFERRED" variable="FALLBACK" />';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        const variableNode = ast.children[0] as Variable;
        expect(variableNode.type).toBe(NodeTypes.variable);
        expect(variableNode.data?.hProperties?.name).toBe('PREFERRED');
      });

      it('should handle Variable with empty name', () => {
        // Variable alone on a line becomes a flow element (top-level node)
        const md = '<Variable />';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        const variableNode = ast.children[0] as Variable;
        expect(variableNode.type).toBe(NodeTypes.variable);
        expect(variableNode.data?.hProperties?.name).toBe('');
      });

      it('should handle multiple Variables in one paragraph', () => {
        const md = 'Hello <Variable name="FIRST_NAME" /> <Variable name="LAST_NAME" />!';
        const ast = processWithNewTypes(md);

        const para = ast.children[0] as Paragraph;
        const variableNodes = para.children.filter(c => c.type === NodeTypes.variable) as Variable[];
        expect(variableNodes).toHaveLength(2);
        expect(variableNodes[0].data?.hProperties?.name).toBe('FIRST_NAME');
        expect(variableNodes[1].data?.hProperties?.name).toBe('LAST_NAME');
      });

      it('should handle Variable in table cells (magic block)', () => {
        const md = `[block:parameters]
{
  "data": {
    "h-0": "Issue",
    "h-1": "Resolution",
    "0-0": "Traffic cannot reach <Variable name="PRODUCT_NICKNAME" />",
    "0-1": "Review the DNS configuration for <Variable name="PRODUCT_NICKNAME" />."
  },
  "cols": 2,
  "rows": 1
}
[/block]`;
        const ast = processWithNewTypes(md);

        // The table should be parsed and contain Variable nodes
        expect(ast.children.length).toBeGreaterThanOrEqual(1);
        const tableNode = ast.children[0];
        expect(tableNode.type).toBe('table');
      });

      it('should handle Variable mixed with other inline content', () => {
        const md = 'Contact **<Variable name="SUPPORT_EMAIL" />** for help.';
        const ast = processWithNewTypes(md);

        const para = ast.children[0] as Paragraph;
        const variableNode = para.children.find(
          c => c.type === NodeTypes.variable || (c as { children?: unknown[] }).children?.some?.((child: { type: string }) => child.type === NodeTypes.variable)
        );
        expect(variableNode).toBeDefined();
      });

      it('should preserve position information', () => {
        // Variable alone on a line becomes a flow element (top-level node)
        const md = '<Variable name="TEST" />';
        const ast = processWithNewTypes(md);

        expect(ast.children).toHaveLength(1);
        const variableNode = ast.children[0] as Variable;
        expect(variableNode.type).toBe(NodeTypes.variable);
        expect(variableNode.position).toBeDefined();
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

    it('should validate magic block image align to a known ImageAlign value', () => {
      const md = `[block:image]
{
  "images": [
    {
      "image": [
        "https://example.com/photo.jpg",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]`;
      const ast = processWithNewTypes(md);

      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.align).toBe('center');
      expect(imageNode.data?.hProperties?.align).toBe('center');
    });

    it('should map magic block image width to sizing', () => {
      const md = `[block:image]
{
  "images": [
    {
      "image": [
        "https://example.com/photo.jpg",
        "",
        ""
      ],
      "sizing": "80"
    }
  ]
}
[/block]`;
      const ast = processWithNewTypes(md);

      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.sizing).toBe('80%');
      expect(imageNode.width).toBe('80%');
      expect(imageNode.data?.hProperties?.sizing).toBe('80%');
      expect(imageNode.data?.hProperties?.width).toBe('80%');
    });

    it('should normalize magic block image border to boolean', () => {
      const md = `[block:image]
{
  "images": [
    {
      "image": [
        "https://example.com/photo.jpg",
        "",
        ""
      ],
      "border": true
    }
  ]
}
[/block]`;
      const ast = processWithNewTypes(md);

      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.border).toBe(true);
      expect(imageNode.data?.hProperties?.border).toBe(true);
    });

    it('should flatten figure (magic block image with caption) into image-block with caption', () => {
      const md = `[block:image]
{
  "images": [
    {
      "image": [
        "https://example.com/photo.jpg",
        "",
        ""
      ],
      "caption": "A caption",
      "border": true
    }
  ]
}
[/block]`;
      const ast = processWithNewTypes(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeTypes.imageBlock);

      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.border).toBe(true);
      expect(imageNode.data?.hProperties?.border).toBe(true);
      expect(imageNode.caption).toBe('A caption');
      expect(imageNode.data?.hProperties?.caption).toBe('A caption');
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

  describe('HTML figure reassembly', () => {
    it('should reassemble <figure> with image and figcaption into an image-block', () => {
      const md = `<figure>
![Alt text](https://example.com/image.png)
<figcaption>Hello World</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;

      expect(imageNode.type).toBe(NodeTypes.imageBlock);
      expect(imageNode.data?.hProperties?.src).toBe('https://example.com/image.png');
      expect(imageNode.caption).toBe('Hello World');
      expect(imageNode.data?.hProperties?.caption).toBe('Hello World');
    });

    it('should handle <figure> with image but no figcaption', () => {
      const md = `<figure>
![Alt text](https://example.com/image.png)
</figure>`;

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;

      expect(imageNode.type).toBe(NodeTypes.imageBlock);
      expect(imageNode.data?.hProperties?.src).toBe('https://example.com/image.png');
      expect(imageNode.caption).toBeUndefined();
    });

    it('should handle <figure> with combined figcaption and closing tag', () => {
      const md = `<figure>
![](https://example.com/photo.jpg)
<figcaption>Caption text</figcaption></figure>`;

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;

      expect(imageNode.type).toBe(NodeTypes.imageBlock);
      expect(imageNode.caption).toBe('Caption text');
    });

    it('should preserve alt text from the image', () => {
      const md = `<figure>
![My alt text](https://example.com/image.png)
<figcaption>A caption</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;

      expect(imageNode.data?.hProperties?.alt).toBe('My alt text');
    });

    it('should handle entire figure block on a single line', () => {
      const md = '<figure>![](https://example.com/image.png)<figcaption>Hello World</figcaption></figure>';

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.type).toBe(NodeTypes.imageBlock);
      expect(imageNode.caption).toBe('Hello World');
    });

    it('should render <figure> with figcaption as a figure element without newEditorTypes', () => {
      const md = `<figure>
![Alt text](https://example.com/image.png)
<figcaption>Hello World</figcaption>
</figure>`;

      const hast = mdxish(md) as HastRoot;
      expect(hast.children.length).toBeGreaterThan(0);

      const figure = hast.children[0] as { tagName?: string };
      expect(figure.tagName).toBe('figure');
    });

    it('should not affect standalone html blocks', () => {
      const md = '<div>Hello</div>';
      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe('html');
    });

    it('should not match escaped opening tag', () => {
      const md = `\\<figure>
![](https://example.com/image.png)
<figcaption>Hello</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).not.toBe(NodeTypes.imageBlock);
    });

    it('should not match opening tag wrapped in inline code', () => {
      const md = `\`<figure>\`
![](https://example.com/image.png)
<figcaption>Hello</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).not.toBe(NodeTypes.imageBlock);
    });

    it('should not match opening tag wrapped in bold', () => {
      const md = `**<figure>**
![](https://example.com/image.png)
<figcaption>Hello</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).not.toBe(NodeTypes.imageBlock);
    });

    it('should not extract caption when figcaption is wrapped in inline code', () => {
      const md = `<figure>
![](https://example.com/image.png)
\`<figcaption>Hello</figcaption>\`
</figure>`;

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.type).toBe(NodeTypes.imageBlock);
      expect(imageNode.caption).toBeUndefined();
    });

    it('should not extract caption when figcaption is wrapped in bold', () => {
      const md = `<figure>
![](https://example.com/image.png)
**<figcaption>Hello</figcaption>**
</figure>`;

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.type).toBe(NodeTypes.imageBlock);
      expect(imageNode.caption).toBeUndefined();
    });

    it('should not match when closing tag is wrapped in inline code', () => {
      const md = `<figure>
![](https://example.com/image.png)
<figcaption>Hello</figcaption>
\`</figure>\``;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).not.toBe(NodeTypes.imageBlock);
    });

    it('should not match when closing tag is wrapped in bold', () => {
      const md = `<figure>
![](https://example.com/image.png)
<figcaption>Hello</figcaption>
**</figure>**`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).not.toBe(NodeTypes.imageBlock);
    });

    it('should reassemble figure inside a callout', () => {
      const md = `> 📘 Note
>
> <figure>
> ![](https://example.com/image.png)
> <figcaption>Hello</figcaption>
> </figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe(NodeTypes.callout);
      const callout = ast.children[0] as Callout;
      const imageBlock = callout.children.find(c => c.type === NodeTypes.imageBlock) as ImageBlock;
      expect(imageBlock).toBeDefined();
      expect(imageBlock.caption).toBe('Hello');
    });

    it('should reassemble single-line figure inside a callout', () => {
      const md = `> 📘 Note
>
> <figure>![](https://example.com/image.png)<figcaption>Hello</figcaption></figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe(NodeTypes.callout);
      const callout = ast.children[0] as Callout;
      const imageBlock = callout.children.find(c => c.type === NodeTypes.imageBlock) as ImageBlock;
      expect(imageBlock).toBeDefined();
      expect(imageBlock.caption).toBe('Hello');
    });

    it('should handle <figure> with attributes', () => {
      const md = `<figure class="special">
![](https://example.com/image.png)
<figcaption>With attrs</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      const imageNode = ast.children[0] as ImageBlock;
      expect(imageNode.type).toBe(NodeTypes.imageBlock);
      expect(imageNode.caption).toBe('With attrs');
    });

    it('should handle <figure> with attributes inside a callout', () => {
      const md = `> 📘 Note
>
> <figure class="special">![](https://example.com/image.png)<figcaption>Attrs</figcaption></figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe(NodeTypes.callout);
      const callout = ast.children[0] as Callout;
      const imageBlock = callout.children.find(c => c.type === NodeTypes.imageBlock) as ImageBlock;
      expect(imageBlock).toBeDefined();
      expect(imageBlock.caption).toBe('Attrs');
    });

    it('should reassemble figure inside a GFM table cell into an image-block', () => {
      const md = `| Column |
| --- |
| <figure>![](https://example.com/image.png)<figcaption>Hello</figcaption></figure> |`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe('table');
      const table = ast.children[0] as { children: { children: { children: RootContent[] }[] }[] };
      const cell = table.children[1].children[0];
      const imageBlock = cell.children.find(c => c.type === NodeTypes.imageBlock) as ImageBlock;
      expect(imageBlock).toBeDefined();
      expect(imageBlock.caption).toBe('Hello');
    });

    it('should leave figure inside a JSX table as opaque table content', () => {
      const md = `<Table>
<thead>
  <tr>
    <th>Column</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td><figure>![](https://example.com/image.png)<figcaption>Hello</figcaption></figure></td>
  </tr>
</tbody>
</Table>`;

      const ast = processWithNewTypes(md);
      expect(ast.children).toHaveLength(1);
      // Without blank lines inside <td>, JSX tables treat content as opaque —
      // <figure> is not parsed into separate MDAST nodes
      expect(ast.children[0].type).toBe('table');
    });

    it('should reassemble figure inside a JSX table with blank lines', () => {
      const md = `<Table>
<thead>
  <tr>
    <th>Figure</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>

<figure>
![](https://example.com/image.png)
<figcaption>Hello World</figcaption>
</figure>

    </td>
  </tr>
</tbody>
</Table>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe('table');
      // With blank lines inside <td>, the parser treats <figure> as an mdxJsxFlowElement
      // and its content is tokenized — so the image and figcaption are accessible
      const table = ast.children[0] as { children: { children: { children: RootContent[] }[] }[] };
      const cell = table.children[1].children[0];
      const imageBlock = cell.children.find(c => c.type === NodeTypes.imageBlock) as ImageBlock;
      expect(imageBlock).toBeDefined();
      expect(imageBlock.caption).toBe('Hello World');
    });

    it('should treat incomplete figure syntax in a GFM table as text', () => {
      const md = `| Content |
| --- |
| <figure>![](https://example.com/image.png) |`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe('table');
    });

    it('should treat figure with missing closing tag in a GFM table as text', () => {
      const md = `| Content |
| --- |
| <figure>![](https://example.com/image.png)<figcaption>Hello</figcaption> |`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe('table');
    });

    it('should treat mangled figure syntax in a GFM table as text', () => {
      const md = `| Content |
| --- |
| \\<figure>![](https://example.com/image.png)<figcaption>Hello</figcaption></figure> |`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe('table');
    });

    it('should handle figure after a callout', () => {
      const md = `> 📘 Note
>
> Some text

<figure>
![](https://example.com/image.png)
<figcaption>Hello</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe(NodeTypes.callout);
      expect(ast.children[1].type).toBe(NodeTypes.imageBlock);
      expect((ast.children[1] as ImageBlock).caption).toBe('Hello');
    });

    it('should handle figure between two callouts', () => {
      const md = `> 📘 First
>
> Text

<figure>
![](https://example.com/image.png)
<figcaption>Caption</figcaption>
</figure>

> ⚠️ Second
>
> More text`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe(NodeTypes.callout);
      expect(ast.children[1].type).toBe(NodeTypes.imageBlock);
      expect((ast.children[1] as ImageBlock).caption).toBe('Caption');
      expect(ast.children[2].type).toBe(NodeTypes.callout);
    });

    it('should handle figure after a GFM table', () => {
      const md = `| A | B |
| --- | --- |
| 1 | 2 |

<figure>
![](https://example.com/image.png)
<figcaption>After table</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      expect(ast.children[0].type).toBe('table');
      expect(ast.children[1].type).toBe(NodeTypes.imageBlock);
      expect((ast.children[1] as ImageBlock).caption).toBe('After table');
    });

    it('should handle figure after a JSX table', () => {
      const md = `<Table>
<thead>
  <tr>
    <th>Header</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>Cell</td>
  </tr>
</tbody>
</Table>

<figure>
![](https://example.com/image.png)
<figcaption>After JSX table</figcaption>
</figure>`;

      const ast = processWithNewTypes(md);
      const figureNode = ast.children.find(c => c.type === NodeTypes.imageBlock) as ImageBlock;
      expect(figureNode).toBeDefined();
      expect(figureNode.caption).toBe('After JSX table');
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

    it('should leave Variable as mdxJsxFlowElement (rendering path unaffected)', () => {
      // Variable alone on a line becomes a flow element (block-level)
      const md = '<Variable name="USERNAME" />';
      const ast = processWithoutNewTypes(md);

      // Variable stays as mdxJsxFlowElement when newEditorTypes is disabled
      expect(ast.children[0].type).toBe('mdxJsxFlowElement');
      expect(ast.children.find(c => c.type === NodeTypes.variable)).toBeUndefined();
    });
  });
});
