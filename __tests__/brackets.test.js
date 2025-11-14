import { mdast, md } from '../index';

describe('square brackets behavior', () => {
  it('retains unmatched open brackets after a closed bracket (link reference)', () => {
    const markdown = '[bar][bar';
    expect(md(mdast(markdown))).toMatchInlineSnapshot(`
      "[bar][bar
      "
    `);
  });

  it('leaves normal shortcut references followed by text untouched', () => {
    const markdown = '[bar]bar';
    expect(md(mdast(markdown))).toMatchInlineSnapshot(`
      "[bar]bar
      "
    `);
  });

  it('parses consecutive square brackets as link references', () => {
    const markdown = '[first][second]';
    const tree = mdast(markdown);
    const paragraph = tree.children[0];

    expect(paragraph.children).toHaveLength(1);
    expect(paragraph.children[0].type).toBe('linkReference');
    expect(paragraph.children[0].label).toBe('second');
    expect(paragraph.children[0].children).toHaveLength(1);
    expect(paragraph.children[0].children[0].value).toBe('first');
  });

  it('does not affect code blocks', () => {
    const markdown = '```\n[bar][bar\n```';
    const tree = mdast(markdown);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]).toMatchObject({
      type: 'code',
      value: '[bar][bar',
    });
  });
});
