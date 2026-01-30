import type { Root } from 'mdast';

import { mdxishAstProcessor } from '../../../lib/mdxish';

describe('mdxishAstProcessor', () => {
  it('should return a unified processor and parser-ready content for simple text', () => {
    const md = 'Rafe is **cool**!';
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    expect(parserReadyContent).toBe(md);
    expect(processor).toBeDefined();
    expect(typeof processor.parse).toBe('function');

    const ast = processor.parse(parserReadyContent);
    // @ts-expect-error - custom matcher
    expect(ast).toStrictEqualExceptPosition({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Rafe is ',
            },
            {
              type: 'strong',
              children: [
                {
                  type: 'text',
                  value: 'cool',
                },
              ],
            },
            {
              type: 'text',
              value: '!',
            },
          ],
        },
      ],
    });
  });

  it('should apply readme flavored md transformers', () => {
    const md = `> 📘 Info
>
> Lorem ipsum dolor sit amet.`;
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    // Need to run the processor to apply transformers
    const parsedAst = processor.parse(parserReadyContent);
    const ast = processor.runSync(parsedAst) as Root;

    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(1);

    // After running transformers, the blockquote should be converted to rdme-callout
    expect(ast.children[0].type).toBe('rdme-callout');

    const callout = ast.children[0];
    expect(callout.data).toBeDefined();
    // @ts-expect-error - custom callout data structure
    expect(callout.data?.hProperties).toBeDefined();
    // @ts-expect-error - custom callout data structure
    expect(callout.data?.hProperties?.theme).toBe('info');
  });

  it('should handle GFM', () => {
    const md = '~~strikethrough~~';
    const { processor, parserReadyContent } = mdxishAstProcessor(md);
    const ast = processor.parse(parserReadyContent);

    // @ts-expect-error - custom matcher
    expect(ast).toStrictEqualExceptPosition({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'delete',
              children: [
                {
                  type: 'text',
                  value: 'strikethrough',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('JSX comments', () => {
    it('should parse inline JSX comments as mdxTextExpression nodes', () => {
      const md = 'Hello {/* inline comment */} world';
      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      const ast = processor.parse(parserReadyContent);

      // @ts-expect-error - custom matcher
      expect(ast).toStrictEqualExceptPosition({
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                value: 'Hello ',
              },
              {
                type: 'mdxTextExpression',
                value: '/* inline comment */',
              },
              {
                type: 'text',
                value: ' world',
              },
            ],
          },
        ],
      });
    });

    it('should parse block-level JSX comments as mdxFlowExpression nodes', () => {
      const md = '{/* block comment */}';
      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      const ast = processor.parse(parserReadyContent);

      // @ts-expect-error - custom matcher
      expect(ast).toStrictEqualExceptPosition({
        type: 'root',
        children: [
          {
            type: 'mdxFlowExpression',
            value: '/* block comment */',
          },
        ],
      });
    });

    it('should preserve JSX comments after running transformers', () => {
      const md = `# Heading

{/* This is a block comment */}

Some text with {/* inline */} comment.`;
      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      const parsedAst = processor.parse(parserReadyContent);
      const ast = processor.runSync(parsedAst) as Root;

      // Find the mdxFlowExpression node (block comment)
      const blockComment = ast.children.find(node => node.type === 'mdxFlowExpression');
      expect(blockComment).toBeDefined();
      // @ts-expect-error - mdxFlowExpression has value property
      expect(blockComment?.value).toBe('/* This is a block comment */');

      // Find the paragraph with inline comment
      const paragraph = ast.children.find(
        node => node.type === 'paragraph' && 'children' in node && node.children.some(child => child.type === 'mdxTextExpression')
      );
      expect(paragraph).toBeDefined();

      // @ts-expect-error - paragraph has children
      const inlineComment = paragraph?.children.find(child => child.type === 'mdxTextExpression');
      expect(inlineComment).toBeDefined();
      expect(inlineComment?.value).toBe('/* inline */');
    });
  });
});
