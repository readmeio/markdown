import { compile } from '../../index';

describe('compile', () => {
  describe('hardBreaks', () => {
    it('does not convert newlines to hard breaks by default', () => {
      const md = 'hello\nthere';
      const tree = compile(md);
      expect(tree).not.toMatch(/br/);
    });

    it('converts newlines to hard breaks when enabled', () => {
      const md = 'hello\nthere';
      const tree = compile(md, { hardBreaks: true });
      expect(tree).toMatch(/br/);
    });
  });

  describe("{ format: 'md' }", () => {
    it('returns plain text of markdown components', () => {
      const md = '[link to doc](doc:getting-started)';

      const tree = compile(md, { format: 'md' });
      expect(tree).toMatch(/href: "doc:getting-started"/);
    });
  });
});
