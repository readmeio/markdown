import { mix } from '../../lib';

describe('evaluateExpressions', () => {
  it('should evaluate numeric operations', () => {
    const content = '{1 + 2 - 1} {4 * 2 / 2}';
    const html = mix(content);
    expect(html).toContain('2 4');
    expect(html).not.toContain('{1 + 2 - 1}');
    expect(html).not.toContain('{4 * 2 / 2}');
  });

  it('should evaluate inline MDX expressions and replace with results', () => {
    const context = {
      count: 5,
      price: 10,
      name: 'Test',
    };

    const content = 'Total: {count * price} items for {name}';
    const html = mix(content, { jsxContext: context });

    // The expressions should be evaluated and converted to text nodes
    expect(html).toContain('50'); // count * price = 50
    expect(html).toContain('Test'); // name = 'Test'
    expect(html).not.toContain('{count * price}');
    expect(html).not.toContain('{name}');
  });

  it('should handle null and undefined expressions', () => {
    const context = {
      nullValue: null,
      undefinedValue: undefined,
    };

    const content = 'Before {nullValue} middle {undefinedValue} after';
    const html = mix(content, { jsxContext: context });

    // Null/undefined should be removed (empty string)
    expect(html).toContain('Before');
    expect(html).toContain('middle');
    expect(html).toContain('after');
    expect(html).not.toContain('nullValue');
    expect(html).not.toContain('undefinedValue');
  });

  it('should handle object expressions', () => {
    const context = {
      obj: { a: 1, b: 2 },
    };

    const content = 'Object: {obj}';
    const html = mix(content, { jsxContext: context });

    // Objects should be JSON stringified (account for JSON escaping in stringified output)
    expect(html).toContain('{"a":1,"b":2}');
  });

  it('should evaluate the string operations', () => {
    const content = 'Hello {"world".toUpperCase()} {"world".length}';
    const html = mix(content);
    expect(html).toContain('Hello WORLD 5');
    expect(html).not.toContain('{"world".toUpperCase()}');
    expect(html).not.toContain('{"world".length}');
  });

  it('should preserve expressions in code blocks', () => {
    const context = {
      count: 5,
    };

    const content = '```\nconst x = {count};\n```';
    const html = mix(content, { jsxContext: context });

    // Expressions in code blocks should be preserved
    expect(html).toContain('{count}');
    expect(html).not.toContain('5');
  });

  it('should not evaluate operations when not in braces', () => {
    const content = '1 + 2 "world".toUpperCase()';
    const html = mix(content);
    expect(html).toContain(content);
    expect(html).not.toContain('WORLD');
    expect(html).not.toContain('3');
  });
});
