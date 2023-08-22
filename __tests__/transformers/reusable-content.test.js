import { mdast } from '../../index';

describe('reusable content transfomer', () => {
  it('should replace a reusable content block if the block is provided', () => {
    const reusableContent = {
      test: `
# Test

[link](http://example.com)
    `,
    };
    const md = `
Before

<ReadMeReusableContent name="test" />

After
    `;

    const tree = mdast(md, { reusableContent });

    expect(tree.children[0].children[0].value).toBe('Before');
    expect(tree.children[1]).toMatchSnapshot();
    expect(tree.children[2].children[0].value).toBe('After');
  });

  it('should parse a reusable content block that is not defined', () => {
    const md = '<ReadMeReusableContent name="not-defined" />';
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('reusable-content');
    expect(tree.children[0].children).toStrictEqual([]);
  });

  it('does not expand reusable content recursively', () => {
    const reusableContent = {
      test: '<ReadMeReusableContent name="test" />',
    };
    const md = '<ReadMeReusableContent name="test" />';
    const tree = mdast(md, { reusableContent });

    expect(tree.children[0].children[0].type).toBe('reusable-content');
    expect(tree.children[0].children[0].children).toStrictEqual([]);
  });
});
