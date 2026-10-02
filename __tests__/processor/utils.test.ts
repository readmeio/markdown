import { toAttributes, pointAfter, getAttrs } from '../../processor/utils';

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

  it('preserves selected empty string values', () => {
    const attrs = toAttributes({ alt: '', caption: '' }, [], { preserveEmpty: ['alt'] });

    expect(attrs).toHaveLength(1);
    expect(attrs[0]).toStrictEqual({
      type: 'mdxJsxAttribute',
      name: 'alt',
      value: '',
    });
  });

  it('skips boolean false values', () => {
    const attrs = toAttributes({ name: 'test', disabled: false, empty: false });

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('name');
  });

  it('preserves selected boolean false values', () => {
    const attrs = toAttributes({ border: false, disabled: false }, [], { preserveFalse: ['border'] });

    expect(attrs).toHaveLength(1);
    expect(attrs[0].name).toBe('border');
    expect(attrs[0].value).toHaveProperty('type', 'mdxJsxAttributeValueExpression');
    expect(attrs[0].value).toHaveProperty('value', 'false');
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

describe('pointAfter', () => {
  it('returns the start point unchanged when nothing is consumed', () => {
    const start = { line: 5, column: 3, offset: 40 };
    expect(pointAfter(start, '')).toStrictEqual({ line: 5, column: 3, offset: 40 });
  });

  it('advances only the column and offset when the consumed run stays on the start line', () => {
    const start = { line: 5, column: 3, offset: 40 };
    expect(pointAfter(start, '0123')).toStrictEqual({ line: 5, column: 7, offset: 44 });
  });

  it('advances the line and resets the column relative to the last newline when the run crosses lines', () => {
    const start = { line: 1, column: 1, offset: 0 };
    // "ab\ncdef\nghi" ends on the 3rd line, 3 chars past its newline.
    expect(pointAfter(start, 'ab\ncdef\nghi')).toStrictEqual({ line: 3, column: 4, offset: 11 });
  });

  it('places the column at 1 when the run ends right after a trailing newline', () => {
    const start = { line: 1, column: 1, offset: 0 };
    expect(pointAfter(start, 'ab\n')).toStrictEqual({ line: 2, column: 1, offset: 3 });
  });

  it('treats a missing start offset as 0', () => {
    const start = { line: 2, column: 5 };
    expect(pointAfter(start, 'xy')).toStrictEqual({ line: 2, column: 7, offset: 2 });
  });

  it('carries a non-zero start offset through unchanged in the same-line case', () => {
    const start = { line: 1, column: 1, offset: 1000 };
    expect(pointAfter(start, 'hello ')).toStrictEqual({ line: 1, column: 7, offset: 1006 });
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
