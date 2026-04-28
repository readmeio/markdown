import { mdast } from '../../index';
import { mdxish } from '../../lib/mdxish';
import { findElementByTagName } from '../helpers';

describe('embeds transformer', () => {
  it('converts a link with a title of "@embed" to an embed-block', () => {
    const md = `
[alt](https://example.com/cool.pdf "@embed")
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('embed-block');
    expect(tree.children[0].data.hProperties.title).toBe('alt');
  });

  describe('in mdxish', () => {
    describe('inside MDX/JSX components', () => {
      it('converts an @embed link inside <Tabs><Tab> to an <embed> element', () => {
        const tree = mdxish(
          '<Tabs>\n<Tab title="x">\n\n[doc](https://example.com/cool.pdf "@embed")\n\n</Tab>\n</Tabs>',
        );

        const embed = findElementByTagName(tree, 'embed');
        expect(embed).toMatchObject({
          type: 'element',
          tagName: 'embed',
          properties: { url: 'https://example.com/cool.pdf', title: 'doc' },
          children: [],
        });
      });

      it('converts an @embed link inside <Callout> to an <embed> element', () => {
        const tree = mdxish(
          '<Callout icon="📘">\n\n[doc](https://example.com/cool.pdf "@embed")\n\n</Callout>',
        );

        const embed = findElementByTagName(tree, 'embed');
        expect(embed).toMatchObject({
          type: 'element',
          tagName: 'embed',
          properties: { url: 'https://example.com/cool.pdf', title: 'doc' },
        });
      });

      it('does NOT convert a regular link (no @embed title) inside <Tabs>', () => {
        const tree = mdxish(
          '<Tabs>\n<Tab title="x">\n\n[doc](https://example.com/cool.pdf)\n\n</Tab>\n</Tabs>',
        );

        expect(findElementByTagName(tree, 'embed')).toBeNull();
        const link = findElementByTagName(tree, 'a');
        expect(link).toMatchObject({
          type: 'element',
          tagName: 'a',
          properties: { href: 'https://example.com/cool.pdf' },
        });
      });
    });
  });
});
