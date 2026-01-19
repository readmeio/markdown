import { mdast, mdx } from '../../index';
import calloutTransformer from '../../processor/transform/callouts';

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
    it('with format "mdx" (or undefined) - leaves empty blockquote as-is', () => {
      const md = '>';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const serialized = mdx(tree);

      // When format is mdx/undefined, empty blockquote is left as blockquote, serializes to '>'
      expect(serialized.trim()).toBe('>');
    });

    it('with format "md" - replaces empty blockquote with stringified content', () => {
      const md = '>';

      const tree = mdast(md, { missingComponents: 'ignore' });
      const transformer = calloutTransformer({ format: 'md' });
      transformer(tree);
      const serialized = mdx(tree);

      // When format is 'md', empty blockquote is replaced with paragraph containing '>', which serializes to '\>'
      expect(serialized.trim()).toContain('\\>');
    });
  });
});
