import { htmlToMarkdown } from '../../lib';

describe('htmlToMarkdown', () => {
  it('returns an empty string for non-string or blank input', () => {
    expect(htmlToMarkdown(undefined)).toBe('');
    expect(htmlToMarkdown(null)).toBe('');
    expect(htmlToMarkdown('')).toBe('');
    expect(htmlToMarkdown('   ')).toBe('');
    // @ts-expect-error guarding the Mongo `Mixed` reality where html may not be a string
    expect(htmlToMarkdown(42)).toBe('');
  });

  it('converts basic block and inline HTML', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title');
    expect(htmlToMarkdown('<p>Hello <strong>world</strong></p>')).toBe('Hello **world**');
    expect(htmlToMarkdown('<a href="https://x.com">link</a>')).toBe('[link](https://x.com)');
  });

  it('uses `-` bullets and `_` emphasis', () => {
    expect(htmlToMarkdown('<ul><li>one</li><li>two</li></ul>')).toBe('- one\n- two');
    expect(htmlToMarkdown('<em>hi</em>')).toBe('_hi_');
  });

  it('converts an html table to a gfm markdown table', () => {
    const html = '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
    expect(htmlToMarkdown(html)).toBe('| a | b |\n| - | - |\n| 1 | 2 |');
  });

  it('converts strikethrough via remark-gfm', () => {
    expect(htmlToMarkdown('a <del>b</del> c')).toBe('a ~~b~~ c');
  });

  it.each(['script', 'style', 'iframe', 'noscript', 'template'])('strips <%s> elements', tag => {
    const html = `<p>keep</p><${tag}>secret</${tag}>`;
    const result = htmlToMarkdown(html);
    expect(result).toContain('keep');
    expect(result).not.toContain('secret');
  });

  it('strips html comments', () => {
    const result = htmlToMarkdown('<p>keep</p><!-- hidden -->');
    expect(result).toContain('keep');
    expect(result).not.toContain('hidden');
  });
});
