import { mdast, mdx } from '../../index';

describe('escape compiler', () => {
  it('handles escapes', () => {
    const txt = '\\&para;';

    expect(mdx(mdast(txt))).toBe('\\&para;\n');
  });
});
