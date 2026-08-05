import type { MdxTextExpression } from 'mdast-util-mdx-expression';

import { describe, it, expect } from 'vitest';

import { mdxish, mix } from '../../../lib';
import { collectNodes, findElementByTagName, parseMdxish } from '../../helpers';

const textExpressions = (doc: string) => collectNodes<MdxTextExpression>(parseMdxish(doc), 'mdxTextExpression');

/**
 * Suite for the lenient MDX text-expression tokenizer, which replaced the old
 * brace-escaping preprocessing: a balanced `{ ... }` tokenizes as an expression,
 * while an unbalanced brace falls back to literal text (the tokenizer returns
 * `nok`, so micromark rolls back). Cases were migrated from the former
 * `preprocess-jsx-expressions` string tests.
 */
describe('mdxExpressionLenient tokenizer', () => {
  describe('tokenizer output (MDAST)', () => {
    it.each([
      ['balanced expression', '{1 + 1}', ['1 + 1']],
      ['nested braces tracked', '{a{b}c}', ['a{b}c']],
      // eslint-disable-next-line no-template-curly-in-string
      ['template literal preserved', '{`t ${x}`}', ['`t ${x}`']],
      ['two separate expressions', 'x {1} y {2}', ['1', '2']],
    ])('emits mdxTextExpression nodes: %s', (_name, input, values) => {
      expect(textExpressions(input).map(node => node.value)).toStrictEqual(values);
    });

    it.each([
      ['unclosed open', 'hello {unclosed'],
      ['unmatched close', 'a } b'],
      ['blank-line split', '{\n\n}'],
    ])('emits no expression node (literal fallback): %s', (_name, input) => {
      expect(textExpressions(input)).toHaveLength(0);
    });

    it('tokenizes a single node with the exact value and position', () => {
      expect(textExpressions('{1 + 1}')).toMatchObject([
        { type: 'mdxTextExpression', value: '1 + 1', position: { start: { offset: 0 }, end: { offset: 7 } } },
      ]);
    });
  });

  describe('valid expressions evaluate', () => {
    it.each([
      ['balanced pair', '{1 + 1}, {2 + 2}', '<p>2, 4</p>'],
      ['ternary', '{true ? "yes" : "no"}', '<p>yes</p>'],
      // eslint-disable-next-line no-template-curly-in-string
      ['template literal interpolation', '{`sum ${1 + 1}`}', '<p>sum 2</p>'],
      ['adjacent expressions', '{1 + 1}{2 + 2}', '<p>24</p>'],
      ['expression next to a tag', '{1 + 1}<b>x</b>', '<p>2<b>x</b></p>'],
      ['nested function calls', '{Math.max(1, Math.min(10, 4))}', '<p>4</p>'],
      ['array map', '{[1, 2, 3].map(x => x * 2).join(",")}', '<p>2,4,6</p>'],
    ])('%s', (_name, input, expected) => {
      expect(mix(input)).toBe(expected);
    });
  });

  describe('unbalanced braces fall back to literal text', () => {
    it.each([
      ['unclosed opening brace', 'Hello {user.name', '<p>Hello {user.name</p>'],
      ['unmatched closing brace', 'Hello user.name}', '<p>Hello user.name}</p>'],
      ['balanced kept, unbalanced literal', 'path /{a}/{b', '<p>path /{a}/{b</p>'],
      ['multiple unclosed', 'Path: /{p1/{p2', '<p>Path: /{p1/{p2</p>'],
      ['equal counts, balanced one evaluates', 'Close } Open { 1 } Open {', '<p>Close } Open 1 Open {</p>'],
    ])('%s', (_name, input, expected) => {
      expect(mix(input)).toBe(expected);
    });

    // Regression: the escaping approach tracked byte offsets and mishandled
    // multi-byte characters. The tokenizer consumes code points, so scripts and
    // emoji are irrelevant to correctness — but keep them covered.
    it.each([
      ['emoji', '📘 test {'],
      ['mandarin', '汉字 test {'],
      ['math symbols', '∑∫∞ test {'],
      ['mixed scripts', 'Hello 你好 مرحبا { World'],
      ['emoji ZWJ sequence', '👩🏽‍💻 test {'],
    ])('renders literally without throwing: %s', (_name, input) => {
      expect(() => mdxish(input)).not.toThrow();
      expect(mix(input)).toContain('{');
    });

    it('never emits a backslash-escaped brace', () => {
      const inputs = ['Hello {user', 'trailing }', '<div>{foo </div>', '{\n\n}'];
      inputs.forEach(input => {
        const out = mix(input);
        expect(out).not.toContain('\\{');
        expect(out).not.toContain('\\}');
      });
    });
  });

  describe('paragraph-spanning braces (blank lines)', () => {
    it('splits a blank-separated brace pair into literal paragraphs', () => {
      expect(mix('{\n\n}')).toBe('<p>{</p>\n<p>}</p>');
    });

    it('keeps a soft-wrapped (no blank line) expression together', () => {
      // `some content` is not a valid expression, so it renders literally.
      expect(mix('{\nsome content\n}')).toBe('<p>{some content}</p>');
    });

    it.each([
      ['empty pair', '{\n\n}'],
      ['content then blank then close', '{content\n\n}'],
      ['multiple consecutive blanks', '{\n\n\n\n}'],
      ['surrounded by prose', 'Hello {\n\n} World'],
    ])('does not throw: %s', (_name, input) => {
      expect(() => mdxish(input)).not.toThrow();
    });
  });

  describe('braces in protected content are untouched', () => {
    it('preserves fenced code blocks with JSX-like braces', () => {
      const out = mix('```jsx\n<div style={{ color: "red" }}></div>\n```');
      expect(out).toContain('{{ color: ');
    });

    it('preserves braces inside inline code', () => {
      expect(mix('Use `href={1+1}` syntax')).toBe('<p>Use <code>href={1+1}</code> syntax</p>');
    });

    it('does not throw on unclosed braces inside inline code', () => {
      expect(() => mdxish('Use `{unclosed` for templates')).not.toThrow();
    });

    it('preserves unbalanced braces inside a magic block', () => {
      expect(() => mdxish('[block:html]{"html":" unclosed { unclosed "}[/block]')).not.toThrow();
    });

    it('keeps unbalanced braces inside an HTMLBlock body', () => {
      const tree = mdxish('<HTMLBlock>{`unclosed } { unclosed `}</HTMLBlock>');
      const htmlBlock = findElementByTagName(tree, 'html-block');
      expect(String(htmlBlock?.properties?.html)).toContain('unclosed } { unclosed ');
    });
  });

  describe('braces inside HTML tags', () => {
    it('preserves a stray brace inside a block element', () => {
      expect(mix('<div>{foo </div>')).toBe('<div>{foo </div>');
    });

    it('does not throw on an unclosed brace beside an inline element', () => {
      expect(() => mdxish('<strong> hello {')).not.toThrow();
    });
  });

  describe('JSX comments', () => {
    it('strips a valid inline JSX comment', () => {
      expect(mix('{/* hidden */} visible')).toBe('<p>visible</p>');
    });

    it('renders a malformed JSX comment literally without throwing', () => {
      expect(() => mdxish('{/* unclosed')).not.toThrow();
      expect(mix('{/* unclosed')).toContain('{/* unclosed');
    });
  });

  // The tokenizer runs on inline content everywhere, so the same balanced-evaluates
  // / unbalanced-falls-back-to-literal behavior must hold inside other constructs.
  describe('integration with other constructs', () => {
    it('evaluates an expression inside a callout', () => {
      expect(mix('> 👍 Tip\n>\n> Sum is {1 + 1}')).toBe(
        '<Callout icon="👍" theme="okay"><h3 id="tip">Tip</h3><p>Sum is 2</p></Callout>',
      );
    });

    it('leaves an unbalanced brace literal inside a callout', () => {
      expect(mix('> 📘 Note\n>\n> value {unclosed')).toBe(
        '<Callout icon="📘" theme="info"><h3 id="note">Note</h3><p>value {unclosed</p></Callout>',
      );
    });

    it('evaluates expressions inside list items', () => {
      expect(mix('- item {1 + 1}\n- item {2 + 2}')).toBe('<ul>\n<li>item 2</li>\n<li>item 4</li>\n</ul>');
    });

    it('leaves an unbalanced brace literal inside a heading', () => {
      expect(mix('# Title {unclosed')).toBe('<h1 id="title-unclosed">Title {unclosed</h1>');
    });

    it('evaluates an expression inside a table cell', () => {
      expect(mix('| a | b |\n|---|---|\n| {1+1} | x |')).toContain('<td>2</td>');
    });
  });
});
