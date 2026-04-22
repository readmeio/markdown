import { mix } from '../../lib';

describe('evaluateExpressions', () => {
  it('should evaluate numeric operations', () => {
    const content = '{1 + 2 - 1} {4 * 2 / 2}';
    const html = mix(content);
    expect(html).toContain('2 4');
    expect(html).not.toContain('{1 + 2 - 1}');
    expect(html).not.toContain('{4 * 2 / 2}');
  });

  it('should evaluate self-contained inline MDX expressions and replace with results', () => {
    const content = 'Total: {5 * 10} items for {"Test"}';
    const html = mix(content);

    // The expressions should be evaluated and converted to text nodes
    expect(html).toContain('50'); // 5 * 10
    expect(html).toContain('Test');
    expect(html).not.toContain('{5 * 10}');
    expect(html).not.toContain('{"Test"}');
  });

  it('should handle null and undefined expressions', () => {
    const content = 'Before {null} middle {undefined} after';
    const html = mix(content);

    // Null/undefined should render as empty strings
    expect(html).toContain('Before');
    expect(html).toContain('middle');
    expect(html).toContain('after');
    expect(html).not.toContain('null');
    expect(html).not.toContain('undefined');
  });

  it('should handle object expressions', () => {
    const content = 'Object: {({a: 1, b: 2})}';
    const html = mix(content);

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
    const content = '```\nconst x = {1 + 1};\n```';
    const html = mix(content);

    // Expressions in code blocks should be preserved
    expect(html).toContain('{1 + 1}');
    expect(html).not.toContain('const x = 2');
  });

  it('should not evaluate operations when not in braces', () => {
    const content = '1 + 2 "world".toUpperCase()';
    const html = mix(content);
    expect(html).toContain(content);
    expect(html).not.toContain('WORLD');
    expect(html).not.toContain('3');
  });

  it('should keep unresolved identifiers as literal text', () => {
    const content = 'Hello {nonexistent}!';
    const html = mix(content);
    expect(html).toContain('{nonexistent}');
  });
});
