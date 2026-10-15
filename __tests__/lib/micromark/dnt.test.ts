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

describe('dnt tokenizer', () => {
  describe('flow: block form', () => {
    it.each([
      ['the opener alone on its line', '<DNT>\n- one\n</DNT>'],
      ['a blank line in the body', '<DNT>one\n\ntwo</DNT>'],
      ['the closer on its own line', '<DNT>- one\n- two\n</DNT>'],
      ['the closer indented on its own line', '<DNT>- one\n  </DNT>'],
      ['the closer ending a later line', '<DNT>- one\n- two</DNT>'],
      ['attributes holding > and braces', '<DNT title="a>b" x={1}>\none\n</DNT>'],
      ['a nested DNT', '<DNT>\n<DNT>a</DNT>\n</DNT>'],
      ['a nested block DNT', '<DNT>\n<DNT>\na\n</DNT>\n</DNT>'],
      ['a closer in a code span', '<DNT>\n`</DNT>`\n</DNT>'],
      ['a closer in a code span spanning lines', '<DNT>\n`code\n</DNT>\nmore`\n</DNT>'],
      ['a closer in a fence', '<DNT>\n```\n</DNT>\n```\n</DNT>'],
      ['a closer in a tilde fence', '<DNT>\n~~~\n</DNT>\n~~~\n</DNT>'],
      ['a closer in an expression', '<DNT>\n{"</DNT>"}\n</DNT>'],
      // eslint-disable-next-line no-template-curly-in-string
      ['a closer in a template literal', '<DNT>\n{`</DNT>${"</DNT>"}`}\n</DNT>'],
      ['an escaped closer', '<DNT>\n\\</DNT>\n</DNT>'],
      ['text after the closer', '<DNT>\none\n</DNT> tail'],
      ['CRLF line endings', '<DNT>\r\none\r\n</DNT>'],
      ['CR line endings', '<DNT>\rone\r</DNT>'],
    ])('claims the whole block with %s', (_label, doc) => {
      expect(htmlValues(doc)).toStrictEqual([doc]);
    });

    it.each([
      ['a lone backtick in the body', '<DNT>\nAcme ` CLI **Cloud**\n</DNT>\n\nafter'],
      ['a lone backtick run shorter than the next one', '<DNT>\nAcme ` CLI ``x``\n</DNT>\n\nafter'],
    ])('claims the block with %s instead of leaving it to html flow', (_label, doc) => {
      expect(tokenizedValues(doc)).toStrictEqual([doc.replace(/\n\nafter$/, '')]);
    });

    it('ends a code span at a blank line, so a closer after it counts', () => {
      expect(htmlValues('<DNT>\n`a\n\n</DNT>\nb`\n</DNT>')[0]).toBe('<DNT>\n`a\n\n</DNT>');
    });

    it('claims a block inside a blockquote', () => {
      expect(htmlValues('> <DNT>\n> one\n> </DNT>')).toStrictEqual(['<DNT>\none\n</DNT>']);
    });

    it('claims an indented block from the start of its line', () => {
      expect(htmlValues('  <DNT>\n  one\n  </DNT>')).toStrictEqual(['  <DNT>\n  one\n  </DNT>']);
    });

  });

  describe('text: inline form', () => {
    it.each([
      ['mid paragraph', 'Hi <DNT>Acme</DNT> there', '<DNT>Acme</DNT>'],
      ['at the start of a line', '<DNT>Acme</DNT> is great', '<DNT>Acme</DNT>'],
      ['across a soft break', '<DNT>Acme\nCloud</DNT> after', '<DNT>Acme\nCloud</DNT>'],
      ['closing on its last line with text after', '<DNT>one\ntwo</DNT> after', '<DNT>one\ntwo</DNT>'],
      ['under a paragraph line', 'Text\n<DNT>one</DNT>', '<DNT>one</DNT>'],
      ['under a paragraph line, across its lines', 'Text\n<DNT>\none\n</DNT>', '<DNT>\none\n</DNT>'],
      ['in a heading', '# Use <DNT>Acme</DNT> now', '<DNT>Acme</DNT>'],
      ['with attributes', 'Hi <DNT title={"x"}>Acme</DNT>', '<DNT title={"x"}>Acme</DNT>'],
      ['with a nested DNT', '<DNT><DNT>a</DNT> b</DNT> c', '<DNT><DNT>a</DNT> b</DNT>'],
      ['with a closer in inline code', '<DNT>a `</DNT>` b</DNT> c', '<DNT>a `</DNT>` b</DNT>'],
      ['with a closer in inline code across a soft break', '<DNT>a `x\n</DNT>` b</DNT> c', '<DNT>a `x\n</DNT>` b</DNT>'],
      ['with a lone backtick', '<DNT>a ` b</DNT> c', '<DNT>a ` b</DNT>'],
      ['with a closer in an expression', '<DNT>a {"</DNT>"} b</DNT> c', '<DNT>a {"</DNT>"} b</DNT>'],
      ['empty', 'Before <DNT></DNT> after', '<DNT></DNT>'],
    ])('claims one node %s', (_label, doc, value) => {
      expect(htmlValues(doc)).toStrictEqual([value]);
    });

    it('claims each DNT on a line as its own node', () => {
      expect(htmlValues('<DNT>a</DNT> and <DNT>b</DNT>')).toStrictEqual(['<DNT>a</DNT>', '<DNT>b</DNT>']);
    });
  });

  describe('fallbacks', () => {
    it.each([
      ['an unclosed inline tag', 'Hi <DNT>Acme', ['<DNT>']],
      ['a self-closing tag', 'Hi <DNT /> x', ['<DNT />']],
      ['a self-closing tag alone on its line', '<DNT />\nafter', ['<DNT />\nafter']],
      ['an unclosed block', '<DNT>\none', ['<DNT>\none']],
      ['another tag with the same prefix', '<DNTS>\na\n</DNTS>', ['<DNTS>\na\n</DNTS>']],
      ['a lowercase tag', '<dnt>a</dnt>', ['<dnt>', '</dnt>']],
    ])('leaves %s to CommonMark', (_label, doc, values) => {
      expect(htmlValues(doc)).toStrictEqual(values);
    });
  });
});
