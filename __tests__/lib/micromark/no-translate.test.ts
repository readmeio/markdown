import type { Html } from 'mdast';

import { describe, expect, it } from 'vitest';

import { mdxishAstProcessor } from '../../../lib';
import { collectNodes } from '../../helpers';

const htmlValues = (doc: string) => {
  const { processor, parserReadyContent } = mdxishAstProcessor(doc);
  return collectNodes<Html>(processor.parse(parserReadyContent), 'html').map(node => node.value);
};

const tokenizedValues = (doc: string) => {
  const { processor, parserReadyContent } = mdxishAstProcessor(doc);
  return collectNodes<Html>(processor.parse(parserReadyContent), 'html')
    .filter(node => node.data?.tokenized)
    .map(node => node.value);
};

describe('noTranslate tokenizer', () => {
  describe('flow: block form', () => {
    it.each([
      ['the opener alone on its line', '<NoTranslate>\n- one\n</NoTranslate>'],
      ['a blank line in the body', '<NoTranslate>one\n\ntwo</NoTranslate>'],
      ['the closer on its own line', '<NoTranslate>- one\n- two\n</NoTranslate>'],
      ['the closer indented on its own line', '<NoTranslate>- one\n  </NoTranslate>'],
      ['the closer ending a later line', '<NoTranslate>- one\n- two</NoTranslate>'],
      ['attributes holding > and braces', '<NoTranslate title="a>b" x={1}>\none\n</NoTranslate>'],
      ['a nested NoTranslate', '<NoTranslate>\n<NoTranslate>a</NoTranslate>\n</NoTranslate>'],
      ['a nested block NoTranslate', '<NoTranslate>\n<NoTranslate>\na\n</NoTranslate>\n</NoTranslate>'],
      ['a closer in a code span', '<NoTranslate>\n`</NoTranslate>`\n</NoTranslate>'],
      ['a closer in a code span spanning lines', '<NoTranslate>\n`code\n</NoTranslate>\nmore`\n</NoTranslate>'],
      ['a closer in a fence', '<NoTranslate>\n```\n</NoTranslate>\n```\n</NoTranslate>'],
      ['a closer in a tilde fence', '<NoTranslate>\n~~~\n</NoTranslate>\n~~~\n</NoTranslate>'],
      ['a closer in an expression', '<NoTranslate>\n{"</NoTranslate>"}\n</NoTranslate>'],
      // eslint-disable-next-line no-template-curly-in-string
      ['a closer in a template literal', '<NoTranslate>\n{`</NoTranslate>${"</NoTranslate>"}`}\n</NoTranslate>'],
      ['an escaped closer', '<NoTranslate>\n\\</NoTranslate>\n</NoTranslate>'],
      ['text after the closer', '<NoTranslate>\none\n</NoTranslate> tail'],
      ['CRLF line endings', '<NoTranslate>\r\none\r\n</NoTranslate>'],
      ['CR line endings', '<NoTranslate>\rone\r</NoTranslate>'],
    ])('claims the whole block with %s', (_label, doc) => {
      expect(htmlValues(doc)).toStrictEqual([doc]);
    });

    it.each([
      ['a lone backtick in the body', '<NoTranslate>\nAcme ` CLI **Cloud**\n</NoTranslate>\n\nafter'],
      ['a lone backtick run shorter than the next one', '<NoTranslate>\nAcme ` CLI ``x``\n</NoTranslate>\n\nafter'],
    ])('claims the block with %s instead of leaving it to html flow', (_label, doc) => {
      expect(tokenizedValues(doc)).toStrictEqual([doc.replace(/\n\nafter$/, '')]);
    });

    it('ends a code span at a blank line, so a closer after it counts', () => {
      expect(htmlValues('<NoTranslate>\n`a\n\n</NoTranslate>\nb`\n</NoTranslate>')[0]).toBe('<NoTranslate>\n`a\n\n</NoTranslate>');
    });

    it('claims a block inside a blockquote', () => {
      expect(htmlValues('> <NoTranslate>\n> one\n> </NoTranslate>')).toStrictEqual(['<NoTranslate>\none\n</NoTranslate>']);
    });

    it('claims an indented block from the start of its line', () => {
      expect(htmlValues('  <NoTranslate>\n  one\n  </NoTranslate>')).toStrictEqual(['  <NoTranslate>\n  one\n  </NoTranslate>']);
    });

  });

  describe('text: inline form', () => {
    it.each([
      ['mid paragraph', 'Hi <NoTranslate>Acme</NoTranslate> there', '<NoTranslate>Acme</NoTranslate>'],
      ['at the start of a line', '<NoTranslate>Acme</NoTranslate> is great', '<NoTranslate>Acme</NoTranslate>'],
      ['across a soft break', '<NoTranslate>Acme\nCloud</NoTranslate> after', '<NoTranslate>Acme\nCloud</NoTranslate>'],
      ['closing on its last line with text after', '<NoTranslate>one\ntwo</NoTranslate> after', '<NoTranslate>one\ntwo</NoTranslate>'],
      ['under a paragraph line', 'Text\n<NoTranslate>one</NoTranslate>', '<NoTranslate>one</NoTranslate>'],
      ['under a paragraph line, across its lines', 'Text\n<NoTranslate>\none\n</NoTranslate>', '<NoTranslate>\none\n</NoTranslate>'],
      ['in a heading', '# Use <NoTranslate>Acme</NoTranslate> now', '<NoTranslate>Acme</NoTranslate>'],
      ['with attributes', 'Hi <NoTranslate title={"x"}>Acme</NoTranslate>', '<NoTranslate title={"x"}>Acme</NoTranslate>'],
      ['with a brace in an attribute string', 'Hi <NoTranslate title={"}"}>Acme</NoTranslate>', '<NoTranslate title={"}"}>Acme</NoTranslate>'],
      ['with a nested NoTranslate', '<NoTranslate><NoTranslate>a</NoTranslate> b</NoTranslate> c', '<NoTranslate><NoTranslate>a</NoTranslate> b</NoTranslate>'],
      ['with a closer in inline code', '<NoTranslate>a `</NoTranslate>` b</NoTranslate> c', '<NoTranslate>a `</NoTranslate>` b</NoTranslate>'],
      ['with a closer in inline code across a soft break', '<NoTranslate>a `x\n</NoTranslate>` b</NoTranslate> c', '<NoTranslate>a `x\n</NoTranslate>` b</NoTranslate>'],
      ['with a lone backtick', '<NoTranslate>a ` b</NoTranslate> c', '<NoTranslate>a ` b</NoTranslate>'],
      ['with a closer in an expression', '<NoTranslate>a {"</NoTranslate>"} b</NoTranslate> c', '<NoTranslate>a {"</NoTranslate>"} b</NoTranslate>'],
      ['empty', 'Before <NoTranslate></NoTranslate> after', '<NoTranslate></NoTranslate>'],
    ])('claims one node %s', (_label, doc, value) => {
      expect(htmlValues(doc)).toStrictEqual([value]);
    });

    it('claims each NoTranslate on a line as its own node', () => {
      expect(htmlValues('<NoTranslate>a</NoTranslate> and <NoTranslate>b</NoTranslate>')).toStrictEqual(['<NoTranslate>a</NoTranslate>', '<NoTranslate>b</NoTranslate>']);
    });
  });

  describe('fallbacks', () => {
    it.each([
      ['an unclosed inline tag', 'Hi <NoTranslate>Acme', ['<NoTranslate>']],
      ['a self-closing tag', 'Hi <NoTranslate /> x', ['<NoTranslate />']],
      ['a self-closing tag alone on its line', '<NoTranslate />\nafter', ['<NoTranslate />\nafter']],
      ['an unclosed block', '<NoTranslate>\none', ['<NoTranslate>\none']],
      ['another tag with the same prefix', '<NoTranslateS>\na\n</NoTranslateS>', ['<NoTranslateS>\na\n</NoTranslateS>']],
      ['a lowercase tag', '<notranslate>a</notranslate>', ['<notranslate>', '</notranslate>']],
    ])('leaves %s to CommonMark', (_label, doc, values) => {
      expect(htmlValues(doc)).toStrictEqual(values);
    });
  });
});
