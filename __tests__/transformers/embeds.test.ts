import { mdast } from '../../index';

describe('embeds transformer', () => {
  it('converts a link with a title of "@embed" to an embed-block', () => {
    const md = `
[alt](https://example.com/cool.pdf "@embed")
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('embed-block');
    expect(tree.children[0].data.hProperties.title).toBe('alt');
  });
});
