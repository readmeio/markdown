import { toAttributes, getAttrs } from '../../processor/utils';

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
