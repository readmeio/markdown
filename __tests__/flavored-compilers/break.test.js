import { mdast, mdx } from '../..';

describe('break compiler', () => {
  it('uses two spaces with `correctnewlines: false`', () => {
    const txt = 'line\nbreak';
    const opts = { correctnewlines: false };

    expect(mdx(mdast(txt, opts), opts)).toBe('line  \nbreak\n');
  });

  it('uses two spaces with `correctnewlines: true`', () => {
    const txt = 'line\\\nbreak';
    const opts = { correctnewlines: true };

    expect(mdx(mdast(txt, opts), opts)).toBe('line  \nbreak\n');
  });
});
