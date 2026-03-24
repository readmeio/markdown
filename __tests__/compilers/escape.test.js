import { mdast, mdx, mdxish } from '../../index';

const findTag = (node, tag) => {
  if (node.tagName === tag) return node;
  if (!node.children) return null;

  let result = null;
  node.children.some(child => {
    result = findTag(child, tag);
    return result;
  });
  return result;
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
    const hast = mdxish('\\<foo\\>');
    const paragraph = hast.children[0];

    expect(paragraph.children[0].value).toBe('<foo>');
  });

  it('consumes backslash for escaped angle brackets inside a failed MDX expression', () => {
    const hast = mdxish('{"\\<foo>"}');
    const paragraph = hast.children[0];

    expect(paragraph.children[0].value).toBe('<foo>');
  });

  it('consumes backslash in a table cell with a failed MDX expression', () => {
    const md = `| col1 | col2 |
| --- | --- |
| **\\-g '\\[{"role" : "\\<primary/secondary>"},{...}]'** | description |`;

    const hast = mdxish(md);
    const tbody = findTag(hast, 'tbody');
    const tr = findTag(tbody, 'tr');
    const td = tr.children.find(c => c.tagName === 'td');

    expect(td.children[0].children[0].value).toBe('-g \'[{"role" : "<primary/secondary>"},{...}]\'');
  });
});
