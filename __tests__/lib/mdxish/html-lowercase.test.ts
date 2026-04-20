import type { Root } from 'mdast';

import { describe, expect, it } from 'vitest';

import { mdxish } from '../../../lib';
import { collectNodes, parseMdxishWithSource } from '../../helpers';

describe('html-lowercase tokenizer', () => {
  describe('captures the whole tag as one html mdast node', () => {
    it('quoted attribute value', () => {
      const { tree } = parseMdxishWithSource('<a href="https://example.com">Example</a>');
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({
        type: 'html',
        value: '<a href="https://example.com">Example</a>',
      });
    });

    it('unquoted URL attribute (the baseline bug fix)', () => {
      const { tree } = parseMdxishWithSource('<a href=https://example.com>Example</a>');
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({
        type: 'html',
        value: '<a href=https://example.com>Example</a>',
      });
    });

    it('unbalanced `{` after `=` stays as a literal unquoted value', () => {
      const { tree } = parseMdxishWithSource('<a href={unclosed>Example</a>');
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({ type: 'html' });
    });

    it('void element <img> without explicit self-close', () => {
      const { tree } = parseMdxishWithSource('<img src=https://example.com/a.png alt="Alt">');
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({ type: 'html' });
    });
  });

  describe('produces the expected hast element', () => {
    it('parses unquoted <a> href, text child, and "Example" value', () => {
      const tree = mdxish('<a href=https://example.com>Example</a>');
      expect(tree.children[0]).toMatchObject({
        type: 'element',
        tagName: 'a',
        properties: { href: 'https://example.com' },
        children: [{ type: 'text', value: 'Example' }],
      });
    });

    it('parses <img> with mixed quoted/unquoted attributes', () => {
      const tree = mdxish('<img src=https://example.com/a.png alt="Alt text">');
      expect(tree.children[0]).toMatchObject({
        type: 'element',
        tagName: 'img',
        properties: { src: 'https://example.com/a.png', alt: 'Alt text' },
      });
    });

    it('parses self-closing <img />', () => {
      const tree = mdxish('<img src="x.png" alt="Alt" />');
      expect(tree.children[0]).toMatchObject({
        tagName: 'img',
        properties: { src: 'x.png', alt: 'Alt' },
      });
    });
  });

  describe('does not break surrounding markdown', () => {
    it('inline tag inside a paragraph preserves leading / trailing text', () => {
      const tree = mdxish('Start <a href=https://example.com>here</a> end.');

      const paragraphs = collectNodes(tree as Root, 'p');
      expect(paragraphs).toHaveLength(1);

      const anchors = collectNodes(paragraphs[0], 'a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0]).toMatchObject({ type: 'element', tagName: 'a', properties: { href: 'https://example.com' } });
    });

    it('inline tag adjacent to markdown emphasis', () => {
      const tree = mdxish('**bold** <a href=https://x.com>link</a> *italic*');

      const paragraphs = collectNodes(tree as Root, 'p');
      expect(paragraphs).toHaveLength(1);

      const strong = collectNodes(paragraphs[0], 'strong')[0];
      expect(strong).not.toBeNull();
      const em = collectNodes(paragraphs[0], 'em')[0];
      expect(em).not.toBeNull();
      const anchor = collectNodes(paragraphs[0], 'a')[0];
      expect(anchor).not.toBeNull();
    });

    it('defers type-6 block tags (<div>) to CommonMark', () => {
      // `<div>` is a CommonMark type-6 tag — this tokenizer must NOT claim it,
      // otherwise figure/figcaption reassembly and html-flow termination break.
      const { tree } = parseMdxishWithSource('<div>inner</div>');
      expect(tree.children[0]).toMatchObject({ type: 'html' });
      // The trailing content / siblings are still handled by CommonMark's
      // html-flow logic, which is what the rest of the pipeline expects.
    });
  });
});
