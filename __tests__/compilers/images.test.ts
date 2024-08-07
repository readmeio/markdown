import { mdast, mdx } from '../../index';

describe('image compiler', () => {
  it('correctly serializes an image back to markdown', () => {
    const txt = '![alt text](/path/to/image.png)';

    expect(mdx(mdast(txt))).toMatch(txt);
  });

  it('correctly serializes an Image component back to MDX', () => {
    const doc = '<Image src="/path/to/image.png" width="200px" alt="alt text" />';

    expect(mdx(mdast(doc))).toMatch(doc);
  });
});
