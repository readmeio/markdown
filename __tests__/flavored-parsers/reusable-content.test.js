import { mdast } from '../../index';

describe('reusable content transfomer', () => {
  it('parses camel cased content', () => {
    const md = '<TestComponent />';
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('reusable-content');
    expect(tree.children[0].tag).toBe('TestComponent');
  });

  it('parses content in a container', () => {
    const md = '> <TestComponent />';
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('blockquote');
    expect(tree.children[0].children[0].type).toBe('reusable-content');
    expect(tree.children[0].children[0].tag).toBe('TestComponent');
  });

  it('should replace a reusable content block if the block is provided', () => {
    const tags = {
      Test: `
# Test

[link](http://example.com)
    `,
    };
    const md = `
Before

<Test />

After
    `;

    const tree = mdast(md, { reusableContent: { tags } });

    expect(tree.children[0].children[0].value).toBe('Before');
    expect(tree.children[1]).toMatchSnapshot();
    expect(tree.children[2].children[0].value).toBe('After');
  });

  it('should replace a reusable content block with multiple words if the block is provided', () => {
    const tags = {
      MyCustomComponent: `
# Test

[link](http://example.com)
    `,
    };
    const md = '<MyCustomComponent />';

    const tree = mdast(md, { reusableContent: { tags } });

    expect(tree.children[0]).toMatchSnapshot();
  });

  it('should insert an empty node if the reusable content block is not defined', () => {
    const md = '<NotDefined />';
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('reusable-content');
    expect(tree.children[0].children).toStrictEqual([]);
  });

  it('does not expand reusable content recursively', () => {
    const tags = {
      Test: '<Test />',
    };
    const md = '<Test />';
    const tree = mdast(md, { reusableContent: { tags } });

    expect(tree.children[0].children[0].type).toBe('reusable-content');
    expect(tree.children[0].children[0].children).toStrictEqual([]);
  });

  it('does not replace reusable content if it is disabled', () => {
    const tags = {
      Test: '<Test />',
    };
    const md = '<Test />';
    const tree = mdast(md, { reusableContent: { tags, disabled: true } });

    expect(tree.children[0].type).toBe('html');
    expect(tree.children[0].value).toBe('<Test />');
  });
});
