import { mdast, md } from '../../index';

describe('reusable content compiler', () => {
  it('writes an undefined reusable content block back to markdown', () => {
    const doc = '<RMReusableContent name="undefined" />';
    const tree = mdast(doc);

    expect(md(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block back to markdown', () => {
    const reusableContent = {
      defined: '# Whoa',
    };
    const doc = '<RMReusableContent name="defined" />';
    const tree = mdast(doc, { reusableContent });

    expect(tree.children[0].children[0].type).toBe('heading');
    expect(md(tree)).toMatch(doc);
  });
});
