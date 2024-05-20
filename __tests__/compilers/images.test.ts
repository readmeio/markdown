import { mdast, mdx } from '../../index';
import { visit } from 'unist-util-visit';

describe('image compiler', () => {
  it('correctly serializes an image back to markdown', () => {
    const txt = '![alt text](/path/to/image.png)';

    expect(mdx(mdast(txt))).toMatch(txt);
  });

  it('correctly serializes an complex image back to markdown', () => {
    const txt = '![alt text](/path/to/image.png)';
    const tree = mdast(txt);
    visit(tree, 'image', image => {
      image.data = { hProperties: { align: 'center' } };
    });

    expect(mdx(tree)).toMatchInlineSnapshot(`
      "<Image {"align":"center"} />
      "
    `);
  });
});
