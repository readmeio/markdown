import { mdast, md } from '../index';

describe('dangling shortcuts', () => {
  it('treats unmatched shortcut references as literal text', () => {
    const markdown = '[bar][bar';
    const tree = mdast(markdown);
    const paragraph = tree.children[0];

    expect(paragraph.type).toBe('paragraph');
    expect(paragraph.children).toHaveLength(1);
    expect(paragraph.children[0]).toMatchObject({
      type: 'text',
      value: markdown,
    });

    expect(md(tree).trimEnd()).toBe(markdown);
  });

  it('leaves normal shortcut references followed by text untouched', () => {
    const markdown = '[bar]bar';
    const tree = mdast(markdown);
    const paragraph = tree.children[0];

    expect(paragraph.children[0].type).toBe('linkReference');
    expect(paragraph.children[1]).toMatchObject({
      type: 'text',
      value: 'bar',
    });
  });

  it('does not affect code blocks', () => {
    const markdown = '```\n[bar][bar\n```';
    const tree = mdast(markdown);

    expect(tree.children[0]).toMatchObject({
      type: 'code',
      value: '[bar][bar',
    });
  });
});
