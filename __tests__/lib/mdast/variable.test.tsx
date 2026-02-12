import type { Paragraph } from 'mdast';

import { mdast } from '../../../lib';

describe('convert variable tag', () => {
  it('wraps root-level Variable in a paragraph', () => {
    const mdx = '<Variable name="username" />';

    const tree = mdast(mdx);
    const firstChild = tree.children[0] as Paragraph;

    expect(firstChild.type).toBe('paragraph');
    expect(firstChild.children[0].type).toBe('readme-variable');
  });

  it('does not double-wrap Variable already inside a paragraph', () => {
    const mdx = 'Hello <Variable name="username" />';

    const tree = mdast(mdx);
    const firstChild = tree.children[0] as Paragraph;

    expect(firstChild.type).toBe('paragraph');
    // The variable should be a direct child of the paragraph, not nested in another paragraph
    expect(firstChild.children.some(child => child.type === 'readme-variable')).toBe(true);
    expect(firstChild.children.every(child => child.type !== 'paragraph')).toBe(true);
  });
});
