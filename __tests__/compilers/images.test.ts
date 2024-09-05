import { mdast, mdx } from '../../index';

describe('image compiler', () => {
  it('correctly serializes an image back to markdown', () => {
    const txt = '![alt text](/path/to/image.png)';

    expect(mdx(mdast(txt))).toMatch(txt);
  });

  it('correctly serializes an inline image back to markdown', () => {
    const txt = 'Forcing it to be inline: ![alt text](/path/to/image.png)';

    expect(mdx(mdast(txt))).toMatch(txt);
  });

  it('correctly serializes an Image component back to MDX', () => {
    const doc = '<Image src="/path/to/image.png" width="200px" alt="alt text" />';

    expect(mdx(mdast(doc))).toMatch(doc);
  });

  it('correctly serializes an Image component with expression attributes back to MDX', () => {
    const doc = '<Image src="/path/to/image.png" border={false} />';

    expect(mdx(mdast(doc))).toMatch(doc);
  });

  it('correctly serializes an Image component with an undefined expression attributes back to MDX', () => {
    const doc = '<Image border={undefined} />';

    expect(mdx(mdast(doc))).toMatch('![]()');
  });
});
