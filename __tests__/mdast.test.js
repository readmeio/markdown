import { mdast } from '../index';

describe('mdast(text, opts)', () => {
  it('should parse mdx', () => {
    const mdx = '<Test>content</Test>';
    const tree = mdast(mdx, { mdx: true });

    expect(tree.children[0].type).toBe('jsx');
  });
});
