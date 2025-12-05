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
});
