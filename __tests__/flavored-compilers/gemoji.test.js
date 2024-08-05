import { mdast, md } from '../../index';

describe('gemoji compiler', () => {
  it('writes an gemojis back to shortcodes', () => {
    const doc = ':poop:';
    const tree = mdast(doc);

    expect(md(tree)).toMatch(doc);
  });

  it('writes legacy gemojis back to shortcodes', () => {
    const doc = ':white-check-mark:';
    const tree = mdast(doc);

    expect(md(tree)).toMatch(doc.replaceAll(/-/g, '_'));
  });
});
