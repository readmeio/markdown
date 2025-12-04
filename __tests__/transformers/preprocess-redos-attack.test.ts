import { describe, it, expect } from 'vitest';

import { preprocessJSXExpressions } from '../../processor/transform/mdxish/preprocess-jsx-expressions';

describe('ReDoS Attack Vectors', () => {
  it('should handle basic attack pattern without hanging', () => {
    const attackString = `<HTMLBlock>{\`${'\\lock\\lock\\'.repeat(100)}lock\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
  });

  it('should handle pattern specifically designed for nested quantifier attack', () => {
    // This pattern exploits the (?:[^`\\]|\\.)* nested quantifier
    // Each backslash can be interpreted as start of escape OR part of previous escape
    const attackString = `<HTMLBlock>{\`${'\\x\\y'.repeat(300)}z\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15000);
    expect(result).toBeDefined();
  });

  it('should handle many consecutive backslashes', () => {
    const attackString = `<HTMLBlock>{\`${'\\'.repeat(1000)}a\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(20000);
    expect(result).toBeDefined();
  });

  it('should handle alternating escape patterns', () => {
    const attackString = `<HTMLBlock>{\`${'\\a\\b'.repeat(200)}x\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
  });

  it('should handle complex nested escape sequences', () => {
    const attackString = `<HTMLBlock>{\`${'\\x\\y\\z\\w'.repeat(150)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
  });

  it('should handle very long template literal content', () => {
    const longContent = 'a'.repeat(50000);
    const attackString = `<HTMLBlock>{\`${longContent}\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(20000);
    expect(result).toBeDefined();
  }, 10000);

  it('should handle very long template literal with escapes', () => {
    const longContent = '\\a'.repeat(10000);
    const attackString = `<HTMLBlock>{\`${longContent}\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(30000);
    expect(result).toBeDefined();
  }, 10000);

  it('should handle multiple HTMLBlock tags with attack patterns', () => {
    const attackPattern = '\\lock\\lock\\'.repeat(50);
    const blocks = new Array(10).fill(`<HTMLBlock>{\`${attackPattern}lock\`}</HTMLBlock>`).join('\n');

    const start = Date.now();
    const result = preprocessJSXExpressions(blocks, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(30000);
    expect(result).toBeDefined();
  }, 10000);

  it('should handle attack pattern with extra whitespace', () => {
    const attackString = `<HTMLBlock>{   \`${'\\lock\\lock\\'.repeat(100)}lock\`   }</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
  });

  it('should handle attack pattern with newlines and whitespace', () => {
    const attackString = `<HTMLBlock>{\n  \`${'\\lock\\lock\\'.repeat(100)}lock\`\n}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
  });

  it('should handle mixed escape and non-escape patterns', () => {
    const pattern = `${'\\a'}${'b'.repeat(10)}`;
    const attackString = `<HTMLBlock>{\`${pattern.repeat(200)}c\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
  });

  it('should handle edge case with escaped backticks in attack pattern', () => {
    const attackString = `<HTMLBlock>{\`${'\\`\\`\\`'.repeat(100)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
  });

  it('should handle HTMLBlock with attributes and attack pattern', () => {
    const attackString = `<HTMLBlock id="test" class="example">{\`${'\\lock\\lock\\'.repeat(200)}lock\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15000);
    expect(result).toBeDefined();
  });

  it('should handle HTMLBlock with many attributes and attack pattern', () => {
    const attrs = 'a="1" b="2" c="3" d="4" e="5" '.repeat(10);
    const attackString = `<HTMLBlock ${attrs}>{\`${'\\lock\\lock\\'.repeat(100)}lock\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with all possible escape sequences', () => {
    const escapes = '\\n\\t\\r\\v\\f\\b\\0\\x00\\u0000';
    const attackString = `<HTMLBlock>{\`${escapes.repeat(500)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with Unicode characters and escapes', () => {
    const attackString = `<HTMLBlock>{\`${'\\u0041\\u0042'.repeat(300)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with mixed valid and invalid escapes', () => {
    const pattern = '\\n\\invalid\\t\\also-invalid\\r';
    const attackString = `<HTMLBlock>{\`${pattern.repeat(400)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(20000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with tabs and newlines in template literal', () => {
    const attackString = `<HTMLBlock>{\`${'\\t\\n\\r'.repeat(500)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(20000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with backslash at every position', () => {
    const attackString = `<HTMLBlock>{\`${'a\\b\\c\\d'.repeat(400)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(20000);
    expect(result).toBeDefined();
  });

  it('should handle pattern designed to maximize backtracking attempts', () => {
    // Pattern where each character could be part of escape or standalone
    const attackString = `<HTMLBlock>{\`${'\\x\\y\\z'.repeat(600)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(30000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with escaped backslashes (double escapes)', () => {
    const attackString = `<HTMLBlock>{\`${'\\\\'.repeat(1000)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(20000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with triple backslashes', () => {
    const attackString = `<HTMLBlock>{\`${'\\\\\\'.repeat(800)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(30000);
    expect(result).toBeDefined();
  });

  it('should handle extremely long whitespace before template literal', () => {
    const whitespace = ' '.repeat(10000);
    const attackString = `<HTMLBlock>{${whitespace}\`${'\\lock\\lock\\'.repeat(50)}lock\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with newlines between braces and backticks', () => {
    const attackString = `<HTMLBlock>{\n\n\n\`${'\\lock\\lock\\'.repeat(100)}lock\`\n\n\n}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15000);
    expect(result).toBeDefined();
  });

  it('should handle pattern with all ASCII printable characters and escapes', () => {
    const chars = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32))
      .filter(c => c !== '`' && c !== '\\')
      .join('\\');
    const attackString = `<HTMLBlock>{\`${chars.repeat(100)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(20000);
    expect(result).toBeDefined();
  });

  it('should handle pattern that alternates between escape and long strings', () => {
    const pattern = `${'\\a'}${'x'.repeat(100)}`;
    const attackString = `<HTMLBlock>{\`${pattern.repeat(200)}end\`}</HTMLBlock>`;

    const start = Date.now();
    const result = preprocessJSXExpressions(attackString, {});
    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(30000);
    expect(result).toBeDefined();
  });
});
