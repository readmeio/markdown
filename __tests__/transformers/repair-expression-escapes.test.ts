import { repairExpressionEscapes } from '../../processor/transform/mdxish/tables/repair-expression-escapes';

describe('repairExpressionEscapes', () => {
  it('strips a markdown-style escape in code position inside an expression', () => {
    // `\_` is invalid JS in code position, so acorn would reject the whole table.
    expect(repairExpressionEscapes('{customer\\_id}').value).toBe('{customer_id}');
  });

  it('leaves text outside an expression untouched', () => {
    expect(repairExpressionEscapes('a\\b {x} c\\d').value).toBe('a\\b {x} c\\d');
  });

  it('preserves a valid backslash escape inside a string literal', () => {
    expect(repairExpressionEscapes('{"a\\tb"}').value).toBe('{"a\\tb"}');
  });

  describe('jsx-style comments', () => {
    // acorn ignores backslashes inside comments, so we must not strip them.
    it('does not strip a backslash from within a block comment', () => {
      const input = '{value /* customer\\_id */}';
      expect(repairExpressionEscapes(input).value).toBe(input);
    });

    it('does not strip a backslash from within a line comment', () => {
      const input = '{value // customer\\_id\n}';
      expect(repairExpressionEscapes(input).value).toBe(input);
    });

    it('strips a code-position escape while preserving one inside a block comment', () => {
      // The first `\_` is code; the second lives in a comment and must survive.
      expect(repairExpressionEscapes('{customer\\_id /* customer\\_id */}').value).toBe(
        '{customer_id /* customer\\_id */}',
      );
    });
  });
});
