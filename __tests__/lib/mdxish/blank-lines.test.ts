import type { Element } from 'hast';

import { toHtml } from 'hast-util-to-html';

import { mdxish } from '../../../lib/mdxish';

describe('blank line preservation', () => {
  it('converts blank lines between paragraphs into <br> elements', () => {
    const md = 'Hello\n\n\n\nWorld';
    const ast = mdxish(md);
    const html = toHtml(ast);

    expect(html).toContain('<br>');
    expect(html).toContain('Hello');
    expect(html).toContain('World');
  });

  it('does not insert <br> for a single blank line between paragraphs', () => {
    const md = 'Hello\n\nWorld';
    const ast = mdxish(md);

    const brElements = ast.children.filter(
      node => node.type === 'element' && (node as Element).tagName === 'br',
    );
    expect(brElements).toHaveLength(0);
  });

  it('inserts multiple <br> elements for multiple blank lines', () => {
    const md = 'First\n\n\n\n\n\nSecond';
    const ast = mdxish(md);

    const brElements = ast.children.filter(
      node => node.type === 'element' && (node as Element).tagName === 'br',
    );
    expect(brElements.length).toBeGreaterThanOrEqual(2);
  });

  it('preserves blank lines between headings and paragraphs', () => {
    const md = '# Heading\n\n\n\nParagraph';
    const ast = mdxish(md);
    const html = toHtml(ast);

    expect(html).toContain('<br>');
    expect(html).toContain('Heading');
    expect(html).toContain('Paragraph');
  });

  it('preserves blank lines between a paragraph and a list', () => {
    const md = 'Some text\n\n\n\n- item one\n- item two';
    const ast = mdxish(md);
    const html = toHtml(ast);

    expect(html).toContain('<br>');
    expect(html).toContain('Some text');
    expect(html).toContain('item one');
  });

  it('preserves blank lines between code blocks and paragraphs', () => {
    const md = '```\ncode\n```\n\n\n\nAfter code';
    const ast = mdxish(md);
    const html = toHtml(ast);

    expect(html).toContain('<br>');
    expect(html).toContain('After code');
  });

  it('does not affect content without extra blank lines', () => {
    const md = '# Title\n\nParagraph one\n\nParagraph two';
    const ast = mdxish(md);

    const brElements = ast.children.filter(
      node => node.type === 'element' && (node as Element).tagName === 'br',
    );
    expect(brElements).toHaveLength(0);
  });
});
