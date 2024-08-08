import { mdast } from '../../index';

describe('images transformer', () => {
  it('converts single children images of paragraphs to an image-block', () => {
    const md = `
![alt](https://example.com/image.jpg)
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('image-block');
    expect(tree.children[0].data.hProperties.src).toBe('https://example.com/image.jpg');
  });

  it('can parse the caption markdown to children', () => {
    const md = `
<Image src="https://example.com/image.jpg" caption="**this** is *markdown*" />
`;
    const tree = mdast(md);

    expect(tree.children[0].children[0].children[0].type).toBe('strong');
    expect(tree.children[0].children[0].children[2].type).toBe('emphasis');
  });
});
