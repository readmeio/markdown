import { mdast, md } from '../../index';

describe('reusable content compiler', () => {
  it('writes an undefined reusable content block as a tag', () => {
    const doc = '<Undefined />';
    const tree = mdast(doc);

    expect(md(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block as a tag', () => {
    const tags = {
      Defined: '# Whoa',
    };
    const doc = '<Defined />';
    const tree = mdast(doc, { reusableContent: { tags } });

    expect(tree.children[0].children[0].type).toBe('heading');
    expect(md(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block with multiple words as a tag', () => {
    const tags = {
      MyCustomComponent: '# Whoa',
    };
    const doc = '<MyCustomComponent />';
    const tree = mdast(doc, { reusableContent: { tags } });

    expect(tree.children[0].children[0].type).toBe('heading');
    expect(md(tree)).toMatch(doc);
  });

  describe('serialize = false', () => {
    it('writes a reusable content block as content', () => {
      const tags = {
        Defined: '# Whoa',
      };
      const doc = '<Defined />';
      const string = md(doc, { reusableContent: { tags, serialize: false } });

      expect(string).toBe('# Whoa\n');
    });
  });
});
