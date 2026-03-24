import type { Root } from 'mdast';

import { mix } from '../../lib';
import { mdxishAstProcessor } from '../../lib/mdxish';

function getAstNodes(md: string, opts = {}) {
  const { processor, parserReadyContent } = mdxishAstProcessor(md, opts);
  return processor.runSync(processor.parse(parserReadyContent)) as Root;
}

function findNodes(node: Record<string, unknown>, type: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  if (node.type === type) results.push(node);
  if (Array.isArray(node.children)) {
    (node.children as Record<string, unknown>[]).forEach(child => {
      results.push(...findNodes(child, type));
    });
  }
  return results;
}

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

  describe('JSX comments', () => {
    it('should preserve block comment expressions as mdxTextExpression nodes in the AST', () => {
      const ast = getAstNodes('Hello {/* this is a comment */} world');
      const expressionNodes = findNodes(ast as unknown as Record<string, unknown>, 'mdxTextExpression');
      expect(expressionNodes).toHaveLength(1);
      expect(expressionNodes[0].value).toBe('/* this is a comment */');
    });

    it('should preserve multiline block comment expressions', () => {
      const ast = getAstNodes('Text {/* line one\nline two */} more');
      const expressionNodes = findNodes(ast as unknown as Record<string, unknown>, 'mdxTextExpression');
      expect(expressionNodes).toHaveLength(1);
      expect(expressionNodes[0].value).toContain('line one');
    });

    it('should preserve empty block comments', () => {
      const ast = getAstNodes('Before {/* */} after');
      const expressionNodes = findNodes(ast as unknown as Record<string, unknown>, 'mdxTextExpression');
      expect(expressionNodes).toHaveLength(1);
      expect(expressionNodes[0].value).toBe('/* */');
    });

    it('should still evaluate non-comment expressions', () => {
      const ast = getAstNodes('Result: {1 + 1}');
      const expressionNodes = findNodes(ast as unknown as Record<string, unknown>, 'mdxTextExpression');
      expect(expressionNodes).toHaveLength(0);
      const textNodes = findNodes(ast as unknown as Record<string, unknown>, 'text');
      const resultText = textNodes.find(n => String(n.value).includes('2'));
      expect(resultText).toBeDefined();
    });

    it('should preserve comments while evaluating other expressions in the same content', () => {
      const ast = getAstNodes('Value: {1 + 1} {/* comment */}');
      const expressionNodes = findNodes(ast as unknown as Record<string, unknown>, 'mdxTextExpression');
      expect(expressionNodes).toHaveLength(1);
      expect(expressionNodes[0].value).toBe('/* comment */');
    });
  });
});
