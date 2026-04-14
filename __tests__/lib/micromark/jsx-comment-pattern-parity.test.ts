import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';

import { jsxComment } from '../../../lib/micromark/jsx-comment';
import { JSX_COMMENT_REGEX } from '../../../lib/micromark/jsx-comment/pattern';

function regexMatches(src: string): boolean {
  JSX_COMMENT_REGEX.lastIndex = 0;
  const matched = JSX_COMMENT_REGEX.test(src);
  JSX_COMMENT_REGEX.lastIndex = 0;
  return matched;
}

function tokenizerMatches(src: string): boolean {
  const tree = fromMarkdown(src, {
    extensions: [jsxComment()],
    mdastExtensions: [mdxExpressionFromMarkdown()],
  });
  return tree.children.some(
    child =>
      child.type === 'mdxFlowExpression' &&
      typeof (child as { value: string }).value === 'string' &&
      /^\s*\/\*[\s\S]*\*\/\s*$/.test((child as { value: string }).value),
  );
}

const fixtures: { name: string; src: string; shouldMatch: boolean }[] = [
  { name: 'bare single-line comment', src: '{/* hi */}', shouldMatch: true },
  { name: 'empty comment', src: '{/**/}', shouldMatch: true },
  { name: 'only whitespace inside', src: '{/*   */}', shouldMatch: true },
  { name: 'multi-line comment', src: '{/*\nhi\n*/}', shouldMatch: true },
  { name: 'comment with blank lines', src: '{/*\n\nhi\n\n*/}', shouldMatch: true },
  { name: 'comment with many asterisks', src: '{/* hi *****/}', shouldMatch: true },
  { name: 'nested braces in content', src: '{/* { foo } */}', shouldMatch: true },
  { name: 'content has closing curly', src: '{/*}*/}', shouldMatch: true },
  { name: 'comment with unicode', src: '{/* 你好 🎉 */}', shouldMatch: true },
  { name: 'whitespace between { and /*', src: '{ /* hi */}', shouldMatch: false },
  { name: 'whitespace between */ and }', src: '{/* hi */ }', shouldMatch: false },
  { name: 'newline between { and /*', src: '{\n/* hi */}', shouldMatch: false },
  { name: 'newline between */ and }', src: '{/* hi */\n}', shouldMatch: false },
  { name: 'no slash', src: '{ hi }', shouldMatch: false },
  { name: 'no asterisk', src: '{/ hi /}', shouldMatch: false },
  { name: 'unclosed comment', src: '{/* hi', shouldMatch: false },
  { name: 'no closing brace', src: '{/* hi */', shouldMatch: false },
  { name: 'only open brace', src: '{', shouldMatch: false },
  { name: 'plain expression', src: '{1 + 1}', shouldMatch: false },
];

describe('JSX comment pattern parity: regex vs tokenizer', () => {
  fixtures.forEach(({ name, src, shouldMatch }) => {
    it(`both agree on: ${name}`, () => {
      const regex = regexMatches(src);
      const tokenizer = tokenizerMatches(src);
      expect(regex).toBe(shouldMatch);
      expect(tokenizer).toBe(shouldMatch);
      expect(regex).toBe(tokenizer);
    });
  });
});
