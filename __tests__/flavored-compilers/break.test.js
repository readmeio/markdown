import { mdast, md } from '../../index';

describe('break compiler', () => {
  it('uses two spaces with `correctnewlines: false`', () => {
    const txt = 'line\nbreak';
    const opts = { correctnewlines: false };

    expect(md(mdast(txt, opts), opts)).toBe('line  \nbreak\n');
  });

  it('uses two spaces with `correctnewlines: true`', () => {
    const txt = 'line\\\nbreak';
    const opts = { correctnewlines: true };

    expect(md(mdast(txt, opts), opts)).toBe('line  \nbreak\n');
  });
});
