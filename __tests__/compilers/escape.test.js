import { mdast, mdx, mix } from '../../index';

describe('escape compiler', () => {
  it('handles escapes', () => {
    const txt = '\\&para;';

    expect(mdx(mdast(txt))).toBe('\\&para;\n');
  });
});

describe('mix escape compiler', () => {
  it.skip('handles escapes', () => {
    const txt = '\\&para;';

    expect(mix(mdast(txt))).toBe('\\&para;\n');
  });
});
