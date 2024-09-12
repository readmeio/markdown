import { mdast as mdastLegacy } from '@readme/markdown-legacy';

import { mdast, mdx } from '../../index';

describe('images transformer', () => {
  it('converts single children images of paragraphs to an image-block', () => {
    const md = `
![alt](https://example.com/image.jpg)
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('image-block');
    expect(tree.children[0].src).toBe('https://example.com/image.jpg');
  });

  it('can parse the caption markdown to children', () => {
    const md = `
<Image src="https://example.com/image.jpg" caption="**this** is *markdown*" />
`;
    const tree = mdast(md);

    expect(tree.children[0].children[0].children[0].type).toBe('strong');
    expect(tree.children[0].children[0].children[2].type).toBe('emphasis');
  });

  it('can parse attributes', () => {
    const md = `
<Image
  align="left"
  alt="Some helpful text"
  src="https://example.com/image.jpg"
  title="Testing"
  width="100px"
/>
`;
    const tree = mdast(md);

    expect(tree.children[0].align).toBe('left');
    expect(tree.children[0].alt).toBe('Some helpful text');
    expect(tree.children[0].title).toBe('Testing');
    expect(tree.children[0].width).toBe('100px');
  });
});
