import { mdast, mdx } from '../../../index';

describe('mdast html block parsing', () => {
  it('parses an html block into mdxJsxTextElement', () => {
    const tree = mdast('<div>Some block html</div>');
    expect(tree).toMatchSnapshot();
  });
});

describe('mdx serialization', () => {
  it('should not add indentation to JSX comment content when serializing', () => {
    const md = `
{/*

## Hey-o

*/}
`;

    const tree = mdast(md, { missingComponents: 'ignore' });
    const serialized = mdx(tree);

    // Extract the comment content line
    const commentMatch = serialized.match(/\{\/\*([\s\S]*?)\*\/\}/);
    const commentContent = commentMatch?.[1];
    const contentLine = commentContent?.split('\n').find(line => line.includes('## Hey-o'));

    // Check that the line does NOT have leading spaces (indentation)
    expect(contentLine).not.toMatch(/^\s+/);
  });

  describe('should print out just ">"', () => {
    it('serializes empty blockquote as escaped ">"', () => {
      const md = '>';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const serialized = mdx(tree);

      // Empty blockquote is replaced with paragraph containing '>', which serializes to '\>'
      expect(serialized.trim()).toContain('\\>');
    });
  });
});
