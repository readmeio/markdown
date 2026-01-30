import type { Root as MdastRoot, RootContent } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx';

import { mdxishMdastToMd } from '../../../lib/mdxish';

describe('mdxishMdastToMd', () => {
  it('should convert a simple paragraph', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Hello world' }],
        },
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('Hello world\n');
  });

  it('should convert readme flavored mdast', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'rdme-callout',
          data: {
            hName: 'Callout',
            hProperties: {
              theme: 'info',
              icon: '📘 Info',
              empty: false,
            },
          },
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Lorem ipsum dolor sit amet.' }],
            },
          ],
        } as RootContent,
      ],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toContain('> 📘 Info');
    expect(result).toContain('Lorem ipsum dolor sit amet.');
  });

  it('should convert GFM mdast', () => {
    const mdast: MdastRoot = {
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
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toContain('~~strikethrough~~');
  });

  it('should handle empty root', () => {
    const mdast: MdastRoot = {
      type: 'root',
      children: [],
    };

    const result = mdxishMdastToMd(mdast);
    expect(result).toBe('');
  });

  describe('MDX JSX syntax', () => {
    it('should convert mdxJsxFlowElement with attributes', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'FooBear',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'prop',
                value: 'value',
              },
            ],
            children: [],
          } as MdxJsxFlowElement as RootContent,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toBe('<FooBear prop="value" />\n');
    });

    it('should convert mdxJsxFlowElement with boolean attribute', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Component',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'disabled',
                value: null,
              },
            ],
            children: [],
          } as MdxJsxFlowElement as RootContent,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toBe('<Component disabled />\n');
    });

    it('should convert mdxJsxFlowElement with children', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Card',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'title',
                value: 'Hello',
              },
            ],
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'Card content here' }],
              },
            ],
          } as MdxJsxFlowElement as RootContent,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('<Card title="Hello">');
      expect(result).toContain('Card content here');
      expect(result).toContain('</Card>');
    });

    it('should convert mdxFlowExpression (block-level JSX comment)', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'mdxFlowExpression',
            value: '/* A comment */',
          } as MdxFlowExpression as RootContent,
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toBe('{/* A comment */}\n');
    });

    it('should convert mdxTextExpression (inline JSX expression)', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', value: 'I have an expression ' },
              {
                type: 'mdxTextExpression',
                value: '1 + 1',
              } as MdxTextExpression,
              { type: 'text', value: '!' },
            ],
          },
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toBe('I have an expression {1 + 1}!\n');
    });

    it('should convert inline mdxTextExpression comment', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', value: 'And ' },
              {
                type: 'mdxTextExpression',
                value: '/* A comment */',
              } as MdxTextExpression,
              { type: 'text', value: ' here is another one!' },
            ],
          },
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toBe('And {/* A comment */} here is another one!\n');
    });

    it('should convert inline mdxJsxTextElement', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', value: 'And here is an inline element: ' },
              {
                type: 'mdxJsxTextElement',
                name: 'BarBaz',
                attributes: [
                  {
                    type: 'mdxJsxAttribute',
                    name: 'someProp',
                    value: 'someValue',
                  },
                ],
                children: [],
              } as MdxJsxTextElement,
              { type: 'text', value: ' with more text after' },
            ],
          },
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toBe('And here is an inline element: <BarBaz someProp="someValue" /> with more text after\n');
    });

    it('should handle complete MDX document with mixed content', () => {
      const mdast: MdastRoot = {
        type: 'root',
        children: [
          {
            type: 'heading',
            depth: 1,
            children: [{ type: 'text', value: 'Heading level 1' }],
          },
          {
            type: 'mdxJsxFlowElement',
            name: 'FooBear',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'prop',
                value: 'value',
              },
            ],
            children: [],
          } as MdxJsxFlowElement as RootContent,
          {
            type: 'mdxFlowExpression',
            value: '/* A comment */',
          } as MdxFlowExpression as RootContent,
          {
            type: 'html',
            value: '<!-- an html comment -->',
          },
          {
            type: 'paragraph',
            children: [
              { type: 'text', value: 'I have an expression ' },
              {
                type: 'mdxTextExpression',
                value: '1 + 1',
              } as MdxTextExpression,
              { type: 'text', value: '!' },
            ],
          },
        ],
      };

      const result = mdxishMdastToMd(mdast);
      expect(result).toContain('# Heading level 1');
      expect(result).toContain('<FooBear prop="value" />');
      expect(result).toContain('{/* A comment */}');
      // Note: HTML comments are converted to JSX comments by the compatibility handler
      expect(result).toContain('{/* an html comment */}');
      expect(result).toContain('I have an expression {1 + 1}!');
    });
  });
});
