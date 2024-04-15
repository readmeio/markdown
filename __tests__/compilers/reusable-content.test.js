import { mdast, mdx } from '../../index';

describe.skip('reusable content compiler', () => {
  it('writes an undefined reusable content block as a tag', () => {
    const doc = '<Undefined />';
    const tree = mdast(doc);

    expect(mdx(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block as a tag', () => {
    const tags = {
      Defined: '# Whoa',
    };
    const doc = '<Defined />';
    const tree = mdast(doc, { reusableContent: { tags } });

    expect(tree.children[0].children[0].type).toBe('heading');
    expect(mdx(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block with multiple words as a tag', () => {
    const tags = {
      MyCustomComponent: '# Whoa',
    };
    const doc = '<MyCustomComponent />';
    const tree = mdast(doc, { reusableContent: { tags } });

    expect(tree.children[0].children[0].type).toBe('heading');
    expect(mdx(tree)).toMatch(doc);
  });

  describe('writeTags = false', () => {
    it('writes a reusable content block as content', () => {
      const tags = {
        Defined: '# Whoa',
      };
      const doc = '<Defined />';
      const string = mdx(doc, { reusableContent: { tags, writeTags: false } });

      expect(string).toBe('# Whoa\n');
    });
  });
});
