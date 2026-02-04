import {
  protectCodeBlocks,
  restoreCodeBlocks,
  restoreInlineCode,
  restoreFencedCodeBlocks,
} from '../../../../lib/utils/mdxish/protect-code-blocks';

describe('protectCodeBlocks', () => {
  describe('basic functionality', () => {
    it('should extract fenced code blocks', () => {
      const input = 'Text before\n```js\nconst x = 1;\n```\nText after';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      expect(protectedCode.codeBlocks).toHaveLength(1);
      expect(protectedCode.codeBlocks[0]).toBe('```js\nconst x = 1;\n```');
      expect(protectedContent).toContain('___CODE_BLOCK_0___');
      expect(protectedContent).not.toContain('```');
    });

    it('should extract inline code', () => {
      const input = 'Use `const` to declare variables';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      expect(protectedCode.inlineCode).toHaveLength(1);
      expect(protectedCode.inlineCode[0]).toBe('`const`');
      expect(protectedContent).toContain('___INLINE_CODE_0___');
    });

    it('should extract both fenced and inline code', () => {
      const input = 'Use `const` like this:\n```js\nconst x = 1;\n```';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      expect(protectedCode.codeBlocks).toHaveLength(1);
      expect(protectedCode.inlineCode).toHaveLength(1);
      expect(protectedContent).toContain('___CODE_BLOCK_0___');
      expect(protectedContent).toContain('___INLINE_CODE_0___');
    });

    it('should handle multiple code blocks', () => {
      const input = '```js\ncode1\n```\n\n```py\ncode2\n```';
      const { protectedCode } = protectCodeBlocks(input);

      expect(protectedCode.codeBlocks).toHaveLength(2);
      expect(protectedCode.codeBlocks[0]).toContain('code1');
      expect(protectedCode.codeBlocks[1]).toContain('code2');
    });

    it('should handle multiple inline codes', () => {
      const input = 'Use `foo` and `bar` together';
      const { protectedCode } = protectCodeBlocks(input);

      expect(protectedCode.inlineCode).toHaveLength(2);
      expect(protectedCode.inlineCode[0]).toBe('`foo`');
      expect(protectedCode.inlineCode[1]).toBe('`bar`');
    });
  });

  describe('inline code should not match across newlines', () => {
    it('should not capture content across multiple lines', () => {
      const input = 'Line with `start\nLine 2\nLine with end`';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      expect(protectedCode.inlineCode).toHaveLength(0);
      expect(protectedContent).toBe(input);
    });

    it('should only capture single-line inline code', () => {
      const input = 'Line with `valid` code\nAnother `line` here';
      const { protectedCode } = protectCodeBlocks(input);

      expect(protectedCode.inlineCode).toHaveLength(2);
      expect(protectedCode.inlineCode[0]).toBe('`valid`');
      expect(protectedCode.inlineCode[1]).toBe('`line`');
    });

    it('should not capture CODE_BLOCK placeholders inside inline code', () => {
      const input = `Here is some \`inline\` code.

\`\`\`js
const x = 1;
\`\`\`

More text with \`another\` inline.

\`\`\`py
print("hello")
\`\`\``;

      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      protectedCode.inlineCode.forEach(code => {
        expect(code).not.toContain('CODE_BLOCK');
        expect(code).not.toContain('\n');
      });

      const restored = restoreCodeBlocks(protectedContent, protectedCode);
      expect(restored).not.toContain('___CODE_BLOCK');
      expect(restored).not.toContain('___INLINE_CODE');
    });

    it('should handle unclosed backtick without capturing multi-line content', () => {
      const input = `Text with unclosed \` backtick

\`\`\`js
const x = 1;
\`\`\`

Some text with \`valid\` inline code.`;

      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      expect(protectedCode.inlineCode).toHaveLength(1);
      expect(protectedCode.inlineCode[0]).toBe('`valid`');

      expect(protectedCode.codeBlocks).toHaveLength(1);
      expect(protectedCode.codeBlocks[0]).toContain('const x = 1');

      const restored = restoreCodeBlocks(protectedContent, protectedCode);
      expect(restored).not.toContain('___CODE_BLOCK');
      expect(restored).toContain('```js');
      expect(restored).toContain('const x = 1');
    });

    it('should handle the exact scenario that caused the bug', () => {
      const input = `Some text with \`-allifs\` option.

\`\`\`
lelastic -dcid [id] -[role] &
\`\`\`

**Additional options:**

- \`-send56\` : Description here

\`\`\`
sudo nano /etc/systemd/system/lelastic.service
\`\`\`

More content with \`inline\` code.`;

      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      protectedCode.inlineCode.forEach(code => {
        expect(code).not.toContain('CODE_BLOCK');
        expect(code.split('\n')).toHaveLength(1);
      });

      const restored = restoreCodeBlocks(protectedContent, protectedCode);
      expect(restored).not.toContain('___CODE_BLOCK');
      expect(restored).not.toContain('___INLINE_CODE');
      expect(restored).toContain('lelastic -dcid');
      expect(restored).toContain('sudo nano');
    });
  });

  describe('restore functions', () => {
    it('should restore fenced code blocks', () => {
      const input = 'Text\n```js\ncode\n```\nMore';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);
      const restored = restoreFencedCodeBlocks(protectedContent, protectedCode);

      expect(restored).toContain('```js\ncode\n```');
      expect(restored).not.toContain('___CODE_BLOCK');
    });

    it('should restore inline code', () => {
      const input = 'Use `const` here';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);
      const restored = restoreInlineCode(protectedContent, protectedCode);

      expect(restored).toContain('`const`');
      expect(restored).not.toContain('___INLINE_CODE');
    });

    it('should restore all code blocks', () => {
      const input = 'Use `const` like:\n```js\nconst x = 1;\n```';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);
      const restored = restoreCodeBlocks(protectedContent, protectedCode);

      expect(restored).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const { protectedCode, protectedContent } = protectCodeBlocks('');

      expect(protectedCode.codeBlocks).toHaveLength(0);
      expect(protectedCode.inlineCode).toHaveLength(0);
      expect(protectedContent).toBe('');
    });

    it('should handle input with no code', () => {
      const input = 'Just plain text';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      expect(protectedCode.codeBlocks).toHaveLength(0);
      expect(protectedCode.inlineCode).toHaveLength(0);
      expect(protectedContent).toBe(input);
    });

    it('should handle unclosed fenced code block', () => {
      const input = 'Text\n```js\nunclosed code block';
      const { protectedCode, protectedContent } = protectCodeBlocks(input);

      expect(protectedCode.codeBlocks).toHaveLength(0);
      expect(protectedContent).toContain('```js');
    });

    it('should handle consecutive backticks in text', () => {
      const input = 'Use `` for empty and ``` for code';
      const { protectedCode } = protectCodeBlocks(input);

      expect(protectedCode.inlineCode).toHaveLength(1);
      expect(protectedCode.inlineCode[0]).toBe('` for empty and `');
    });

    it('should handle code block with language specifier', () => {
      const input = '```typescript\nconst x: number = 1;\n```';
      const { protectedCode } = protectCodeBlocks(input);

      expect(protectedCode.codeBlocks).toHaveLength(1);
      expect(protectedCode.codeBlocks[0]).toContain('typescript');
    });

    it('should handle code block with filename meta', () => {
      const input = '```yaml /etc/config.yaml\nkey: value\n```';
      const { protectedCode } = protectCodeBlocks(input);

      expect(protectedCode.codeBlocks).toHaveLength(1);
      expect(protectedCode.codeBlocks[0]).toContain('/etc/config.yaml');
    });
  });
});
