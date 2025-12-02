import { mdxish } from '../../lib/mdxish';

describe('evaluateExpressions', () => {
  it('should evaluate inline MDX expressions and replace with results', () => {
    const context = {
      count: 5,
      price: 10,
      name: 'Test',
    };

    const content = 'Total: {count * price} items for {name}';
    const hast = mdxish(content, { jsxContext: context });

    // The expressions should be evaluated and converted to text nodes
    const textContent = JSON.stringify(hast);
    expect(textContent).toContain('50'); // count * price = 50
    expect(textContent).toContain('Test'); // name = 'Test'
    expect(textContent).not.toContain('{count * price}');
    expect(textContent).not.toContain('{name}');
  });

  it('should handle null and undefined expressions', () => {
    const context = {
      nullValue: null,
      undefinedValue: undefined,
    };

    const content = 'Before {nullValue} middle {undefinedValue} after';
    const hast = mdxish(content, { jsxContext: context });

    // Null/undefined should be removed (empty string)
    const textContent = JSON.stringify(hast);
    expect(textContent).toContain('Before');
    expect(textContent).toContain('middle');
    expect(textContent).toContain('after');
    expect(textContent).not.toContain('nullValue');
    expect(textContent).not.toContain('undefinedValue');
  });

  it('should handle object expressions', () => {
    const context = {
      obj: { a: 1, b: 2 },
    };

    const content = 'Object: {obj}';
    const hast = mdxish(content, { jsxContext: context });

    // Objects should be JSON stringified (account for JSON escaping in stringified output)
    const textContent = JSON.stringify(hast);
    expect(textContent).toContain('{\\"a\\":1,\\"b\\":2}');
  });

  it('should preserve expressions in code blocks', () => {
    const context = {
      count: 5,
    };

    const content = '```\nconst x = {count};\n```';
    const hast = mdxish(content, { jsxContext: context });

    // Expressions in code blocks should be preserved
    const textContent = JSON.stringify(hast);
    expect(textContent).toContain('{count}');
    expect(textContent).not.toContain('5');
  });
});

