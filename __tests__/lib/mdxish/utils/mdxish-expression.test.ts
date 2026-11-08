import { jsxComponentNames } from '../../../../lib/utils/mdxish/mdxish-expression';

describe('jsxComponentNames', () => {
  it.each([
    ['a bare tag', '<Foo />', ['Foo']],
    ['a tag with children', '<Foo>bar</Foo>', ['Foo']],
    ['nested tags', '<Foo><Bar /></Foo>', ['Foo', 'Bar']],
    ['tags in both branches of a ternary', 'ok ? <Foo /> : <Bar />', ['Foo', 'Bar']],
    ['tags returned from a callback', '[1, 2].map(i => <Foo key={i} />)', ['Foo']],
    ['a tag inside a fragment', '<><Foo /></>', ['Foo']],
    ['a tag in an attribute value', '<Foo bar={<Baz />} />', ['Foo', 'Baz']],
  ])('should collect %s', (_label, expression, expected) => {
    expect(jsxComponentNames(expression)).toStrictEqual(expected);
  });

  it('should report each name once', () => {
    expect(jsxComponentNames('<Foo><Foo /></Foo>')).toStrictEqual(['Foo']);
  });

  it.each([
    ['an expression with no JSX', 'Math.max(1, 2)'],
    ['a capitalized right operand of a comparison', 'count < Max ? 1 : 2'],
    ['a capitalized identifier outside tag position', 'Foo.bar(Baz)'],
    ['a lowercase tag, which compiles to a string type', '<div><span /></div>'],
    ['an unparseable expression', '<Foo'],
    ['a namespaced tag, which compiles to a string type', '<Foo:Bar />'],
    ['a hyphenated tag, which compiles to a string type', '<My-Block />'],
    ['a member expression tag, whose object must come from the real scope', '<Foo.Bar />'],
  ])('should collect nothing from %s', (_label, expression) => {
    expect(jsxComponentNames(expression)).toStrictEqual([]);
  });
});
