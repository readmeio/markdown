import { toAttributes, getAttrs, createValueToSourceMapper } from '../../processor/utils';

const expressionAttribute = (name: string, value: string) => ({
  type: 'mdxJsxAttribute',
  name,
  value: { type: 'mdxJsxAttributeValueExpression', value },
});

describe('toAttributes', () => {
  it('converts string values to string attributes', () => {
    const attrs = toAttributes({ name: 'test', value: 'hello' });

    expect(attrs).toHaveLength(2);
    expect(attrs[0]).toStrictEqual({
      type: 'mdxJsxAttribute',
      name: 'name',
      value: 'test',
    });
    expect(attrs[1]).toStrictEqual({
      type: 'mdxJsxAttribute',
      name: 'value',
      value: 'hello',
    });
  });

  it('converts null values to boolean true attributes', () => {
    const attrs = toAttributes({ disabled: null });

    // null values should be skipped (returns early)
    expect(attrs).toHaveLength(0);
  });

  it('skips undefined values', () => {
    const attrs = toAttributes({ name: 'test', missing: undefined });

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('name');
  });

  it('skips empty string values', () => {
    const attrs = toAttributes({ name: 'test', empty: '' });

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('name');
  });

  it('skips boolean false values', () => {
    const attrs = toAttributes({ name: 'test', disabled: false, empty: false });

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('name');
  });

  it('converts boolean true to expression attribute', () => {
    const attrs = toAttributes({ enabled: true });

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('enabled');
    expect(attrs[0].value).toHaveProperty('type', 'mdxJsxAttributeValueExpression');
    expect(attrs[0].value).toHaveProperty('value', 'true');
  });

  it('converts numbers to expression attributes', () => {
    const attrs = toAttributes({ count: 42 });

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('count');
    expect(attrs[0].value).toHaveProperty('type', 'mdxJsxAttributeValueExpression');
    expect(attrs[0].value).toHaveProperty('value', '42');
  });

  it('filters attributes by keys when provided', () => {
    const attrs = toAttributes({ name: 'test', value: 'hello', ignored: 'skip' }, ['name', 'value']);

    expect(attrs).toHaveLength(2);
    expect(attrs.map(a => a.name)).toStrictEqual(['name', 'value']);
  });

  it('skips false values even when in keys list', () => {
    const attrs = toAttributes({ name: 'test', empty: false }, ['name', 'empty']);

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('name');
  });
});

// CX-4028
describe('createValueToSourceMapper', () => {
  const positionOf = (source: string, value: string) => {
    const offset = source.indexOf(value.split('\n')[0]);
    return { start: { line: 1, column: offset + 1, offset }, end: { line: 3, column: 1, offset: source.length } };
  };

  it('returns null without a start offset', () => {
    expect(createValueToSourceMapper(undefined, 'a', 'a')).toBeNull();
  });

  it('shifts a verbatim value by its start point', () => {
    const source = 'Hello\n<x>\n  <y>';
    const value = '<x>\n  <y>';
    const toSourcePoint = createValueToSourceMapper(
      { start: { line: 2, column: 1, offset: 6 }, end: { line: 3, column: 6, offset: 15 } },
      value,
      source,
    )!;

    expect(toSourcePoint(0)).toStrictEqual({ line: 2, column: 1, offset: 6 });
    expect(toSourcePoint(value.indexOf('<y>'))).toStrictEqual({ line: 3, column: 3, offset: 12 });
  });

  it('adds back the prefix a container stripped from each continuation line', () => {
    const source = '> <x>\n>   <y>\n><z>';
    const value = '<x>\n  <y>\n<z>';
    const toSourcePoint = createValueToSourceMapper(positionOf(source, value), value, source)!;

    expect(toSourcePoint(value.indexOf('<x>'))).toStrictEqual({ line: 1, column: 3, offset: 2 });
    expect(toSourcePoint(value.indexOf('<y>'))).toStrictEqual({ line: 2, column: 5, offset: source.indexOf('<y>') });
    expect(toSourcePoint(value.indexOf('<z>'))).toStrictEqual({ line: 3, column: 2, offset: source.indexOf('<z>') });
    expect(toSourcePoint(value.length).offset).toBe(source.length);
  });

  it('aligns a line whose prefix tab was expanded to spaces', () => {
    const source = '> <x>\n>\t<y>';
    const value = '<x>\n  <y>';
    const toSourcePoint = createValueToSourceMapper(positionOf(source, value), value, source)!;

    expect(toSourcePoint(value.indexOf('<y>')).offset).toBe(source.indexOf('<y>'));
  });

  it.each([
    ['no source', undefined],
    ['a source that does not line up', '> <x>\n> <nope>\n'],
  ])('treats the value as verbatim given %s', (_, source) => {
    const value = '<x>\n  <y>';
    const toSourcePoint = createValueToSourceMapper(
      { start: { line: 4, column: 3, offset: 10 }, end: { line: 5, column: 6, offset: 20 } },
      value,
      source,
    )!;

    expect(toSourcePoint(value.indexOf('<y>'))).toStrictEqual({ line: 5, column: 3, offset: 16 });
  });
});

describe('getAttrs', () => {
  it('resolves literal expressions and keeps the raw source for everything else', () => {
    const node = {
      type: 'mdxJsxFlowElement',
      name: 'Foo',
      attributes: [
        expressionAttribute('style', '{ color: "red" }'),
        expressionAttribute('count', '1 + 2'),
        expressionAttribute('icon', 'item.url'),
        expressionAttribute('missing', 'undefined'),
        { type: 'mdxJsxAttribute', name: 'border', value: null },
        { type: 'mdxJsxAttribute', name: 'src', value: '/a.png' },
        { type: 'mdxJsxAttribute', name: 'title', value: 'a &amp; b' },
        { type: 'mdxJsxExpressionAttribute', value: '...spread' },
      ],
      children: [],
    };

    expect(getAttrs(node as never)).toStrictEqual({
      style: { color: 'red' },
      count: 3,
      icon: 'item.url',
      missing: undefined,
      border: true,
      src: '/a.png',
      title: 'a & b',
    });
  });
});
