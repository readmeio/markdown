import { mdast } from '../../index';

describe('reusable content transfomer', () => {
  it('should unwrap the content when `wrap: false`', () => {
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

    const tree = mdast(md, { reusableContent: { tags, wrap: false } });

    expect(tree.children[0].children[0].value).toBe('Before');
    expect(tree.children[1].type).toBe('heading');
    expect(tree.children[2].type).toBe('paragraph');
    expect(tree.children[3].children[0].value).toBe('After');
  });

  it('should unwrap consecutive the content when `wrap: false`', () => {
    const tags = {
      Test: `
# Test

[link](http://example.com)
    `,
    };
    const md = `
Before

<Test />

<Test />

After
    `;

    const tree = mdast(md, { reusableContent: { tags, wrap: false } });

    expect(tree.children[0].children[0].value).toBe('Before');
    expect(tree.children[1].type).toBe('heading');
    expect(tree.children[2].type).toBe('paragraph');
    expect(tree.children[3].type).toBe('heading');
    expect(tree.children[4].type).toBe('paragraph');
    expect(tree.children[5].children[0].value).toBe('After');
  });
});
