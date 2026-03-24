import { toAttributes } from '../../processor/utils';

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
