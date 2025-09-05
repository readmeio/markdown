import { compile } from '../../index';

describe('compile', () => {
  describe("{ format: 'md' }", () => {
    it('returns plain text of markdown components', () => {
      const md = '[link to doc](doc:getting-started)';

      const tree = compile(md, { format: 'md' });
      expect(tree).toMatch(/href: "doc:getting-started"/);
    });
  });
});
