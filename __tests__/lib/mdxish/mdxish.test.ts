import { mdxish } from '../../../lib/mdxish';

describe('mdxish', () => {
  describe('invalid mdx syntax', () => {
    it('should render unclosed tags', () => {
      const md = '<br>';
      expect(() => mdxish(md)).not.toThrow();
    });

        it('should render content in new lines', () => {
            const md = `<div>hello
</div>`;
      expect(() => mdxish(md)).not.toThrow();
    });
  });
});