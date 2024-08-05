import { mdast, md } from '../../index';

describe('image compiler', () => {
  it('correctly serializes an image back to markdown', () => {
    const txt = '![alt text](/path/to/image.png)';

    expect(md(mdast(txt))).toMatch(txt);
  });
});
