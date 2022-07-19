import { mdast, md } from '../../index';

describe('escape compiler', () => {
  it('handles escapes', () => {
    const txt = '\\&para;';

    expect(md(mdast(txt))).toBe('\\&para;\n');
  });
});
