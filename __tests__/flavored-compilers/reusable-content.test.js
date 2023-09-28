import { mdast, md } from '../../index';

describe('reusable content compiler', () => {
  it('writes an undefined reusable content block back to markdown', () => {
    const doc = '<Undefined />';
    const tree = mdast(doc);

    expect(md(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block back to markdown', () => {
    const reusableContent = {
      Defined: '# Whoa',
    };
    const doc = '<Defined />';
    const tree = mdast(doc, { reusableContent });

    expect(tree.children[0].children[0].type).toBe('heading');
    expect(md(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block with multiple words back to markdown', () => {
    const reusableContent = {
      MyCustomComponent: '# Whoa',
    };
    const doc = '<MyCustomComponent />';
    const tree = mdast(doc, { reusableContent });

    expect(tree.children[0].children[0].type).toBe('heading');
    expect(md(tree)).toMatch(doc);
  });
});
