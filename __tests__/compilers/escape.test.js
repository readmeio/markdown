import { mdast, mdx, mdxish } from '../../index';

describe('escape compiler', () => {
  it('handles escapes', () => {
    const txt = '\\&para;';

    expect(mdx(mdast(txt))).toBe('\\&para;\n');
  });
});

describe('mdxish escape compiler', () => {
  it('handles escapes', () => {
    const txt = '\\&para;';

    const hast = mdxish(txt);
    const paragraph = hast.children[0];

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    expect(paragraph.children[0].type).toBe('text');
    expect(paragraph.children[0].value).toBe('&para;');
  });

  it('does not render backslash for escaped angle brackets', () => {
    const txt = '\\<foo\\>';

    const hast = mdxish(txt);
    const paragraph = hast.children[0];

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');

    const textContent = paragraph.children.map(c => c.value || '').join('');
    expect(textContent).not.toContain('\\');
    expect(textContent).toContain('<foo>');
  });

  it('does not render backslash for escaped angle brackets in a table cell', () => {
    const txt = `| col |
| --- |
| \\<primary/secondary/client\\> |`;

    const hast = mdxish(txt);
    const html = JSON.stringify(hast);
    expect(html).not.toContain('\\\\');
    expect(html).not.toContain('\\<');
  });

  it('does not render backslash for escaped angle brackets in bold text within a table cell', () => {
    const txt = `| col |
| --- |
| **\\-g "\\<primary/secondary/client>"** |`;

    const hast = mdxish(txt);
    const html = JSON.stringify(hast);
    expect(html).not.toContain('\\\\<');
  });

  it('does not render backslash when escaped and unescaped angle brackets coexist with MDX expressions in a table cell', () => {
    const txt = `| col1 | col2 |
| --- | --- |
| **\\-g '\\[{"svcgname" : "<name>", "role" : "\\<primary/secondary/client>"},{...}]'** | Register this host |`;

    const hast = mdxish(txt);
    const html = JSON.stringify(hast);
    expect(html).not.toContain('\\\\<primary');
    expect(html).not.toContain('\\<primary');
  });
});
