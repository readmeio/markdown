import { mdast, mdx, mdxish } from '../../index';

const getTextContent = hast => {
  const texts = [];
  const walk = node => {
    if (node.value !== undefined) texts.push(node.value);
    if (node.children) node.children.forEach(walk);
  };
  walk(hast);
  return texts.join('');
};

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

  it('consumes backslash for escaped angle brackets', () => {
    const text = getTextContent(mdxish('\\<foo\\>'));

    expect(text).toContain('<foo>');
    expect(text).not.toContain('\\');
  });

  it('consumes backslash for escaped angle brackets inside a failed MDX expression', () => {
    const text = getTextContent(mdxish('{"\\<foo>"}'));

    expect(text).toContain('<foo>');
    expect(text).not.toContain('\\<');
  });

  it('consumes backslash in a table cell with a failed MDX expression', () => {
    const md = `| col1 | col2 |
| --- | --- |
| **\\-g '\\[{"role" : "\\<primary/secondary>"},{...}]'** | description |`;

    const text = getTextContent(mdxish(md));

    expect(text).toContain('<primary/secondary>');
    expect(text).not.toContain('\\<');
  });
});
