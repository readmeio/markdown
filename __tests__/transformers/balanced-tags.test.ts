import {
  findBalancedClosingTagIndex,
  findBalancedOpenerOffsets,
} from '../../processor/transform/mdxish/components/utils';

/** Openers in `html` that `findBalancedOpenerOffsets` reports balanced, as `tag@offset`. */
const balancedOpeners = (html: string) =>
  [...findBalancedOpenerOffsets(html)].sort((a, b) => a - b).map(offset => html.slice(offset).match(/^<\w+/)?.[0]);

describe('findBalancedOpenerOffsets', () => {
  it('pairs each closer with the innermost same-name opener', () => {
    expect(balancedOpeners('<div>a<div>b</div>\n</div>')).toStrictEqual(['<div', '<div']);
    expect(balancedOpeners('<div> a\n<div>b</div>')).toStrictEqual(['<div']);
    expect(findBalancedOpenerOffsets('<div> a\n<div>b</div>').has(0)).toBe(false);
  });

  it('leaves an implicitly closed sibling <li> unbalanced', () => {
    const html = '<li> First\ntext\n<li> Second</li>';
    expect([...findBalancedOpenerOffsets(html)]).toStrictEqual([html.lastIndexOf('<li>')]);
  });

  it('ignores closers inside attribute values and code spans', () => {
    expect(findBalancedOpenerOffsets('<div> a\n<span title="</div>">x</span>').has(0)).toBe(false);
    expect(findBalancedOpenerOffsets('<div> a `</div>`').has(0)).toBe(false);
  });

  it.each(['<div>**a**</div><div>**b**</div>', '<li> one\n<li> two</li>', '<div> a\n<div>b</div>\n</div>'])(
    'agrees with findBalancedClosingTagIndex on the first opener of %j',
    html => {
      const tag = html.match(/^<(\w+)>/)![1];
      const closedByIndex = findBalancedClosingTagIndex(html.slice(tag.length + 2), tag) !== -1;
      expect(findBalancedOpenerOffsets(html).has(0)).toBe(closedByIndex);
    },
  );
});
