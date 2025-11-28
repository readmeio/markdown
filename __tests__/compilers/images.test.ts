import type { Element } from 'hast';

import { mdast, mdx, mdxish } from '../../index';

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
    const doc = '<Image src="/path/to/image.png" width="200px" height="150px" alt="alt text" />';

    expect(mdx(mdast(doc))).toMatch(doc);
  });

  it('ignores empty (undefined, null, or "") attributes', () => {
    const doc = '<Image src="/path/to/image.png" border={true} alt="" title={null} align={undefined} />';

    expect(mdx(mdast(doc))).toMatch('<Image border={true} src="/path/to/image.png" />');
  });

  it('correctly serializes an Image component with expression attributes back to MDX', () => {
    const doc = '<Image src="/path/to/image.png" border={false} />';

    expect(mdx(mdast(doc))).toMatch('![](/path/to/image.png)');

    const doc2 = '<Image src="/path/to/image.png" border={true} />';

    expect(mdx(mdast(doc2))).toMatch('<Image border={true} src="/path/to/image.png" />');
  });

  it('correctly serializes an Image component with an undefined expression attributes back to MDX', () => {
    const doc = '<Image border={undefined} />';

    expect(mdx(mdast(doc))).toMatch('![]()');
  });
});

describe('mdxish image compiler', () => {
  it('correctly converts markdown images to img elements', () => {
    const txt = '![alt text](/path/to/image.png)';

    const hast = mdxish(txt);
    const image = hast.children[0] as Element;

    // Standalone markdown images are converted directly to img elements (not wrapped in paragraph)
    expect(image.type).toBe('element');
    expect(image.tagName).toBe('img');
    expect(image.properties.src).toBe('/path/to/image.png');
    expect(image.properties.alt).toBe('alt text');
  });

  it('correctly converts inline images to img elements', () => {
    const txt = 'Forcing it to be inline: ![alt text](/path/to/image.png)';

    const hast = mdxish(txt);
    const paragraph = hast.children[0] as Element;
    const image = paragraph.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'img',
    ) as Element;

    expect(paragraph.type).toBe('element');
    expect(paragraph.tagName).toBe('p');
    expect(image).toBeDefined();
    expect(image.properties.src).toBe('/path/to/image.png');
    expect(image.properties.alt).toBe('alt text');
  });

  it('correctly converts Image component with attributes', () => {
    const doc = '<Image src="/path/to/image.png" width="200px" height="150px" alt="alt text" />';

    const hast = mdxish(doc);
    const image = hast.children[0] as Element;

    expect(image.type).toBe('element');
    expect(image.tagName).toBe('img');
    expect(image.properties.src).toBe('/path/to/image.png');
    expect(image.properties.width).toBe('200px');
    expect(image.properties.height).toBe('150px');
    expect(image.properties.alt).toBe('alt text');
  });

  it('handles Image component with border attribute', () => {
    const doc = '<Image src="/path/to/image.png" border={true} alt="" />';

    const hast = mdxish(doc);
    const image = hast.children[0] as Element;

    expect(image.type).toBe('element');
    expect(image.tagName).toBe('img');
    expect(image.properties.src).toBe('/path/to/image.png');
    expect(image.properties.border).toBe('true');
    expect(image.properties.alt).toBe('');
  });

  it('correctly converts Image component with border={false} to markdown-style image', () => {
    const doc = '<Image src="/path/to/image.png" border={false} />';

    const hast = mdxish(doc);
    const image = hast.children[0] as Element;

    // Image component with border={false} is converted directly to img (not wrapped in paragraph)
    expect(image.type).toBe('element');
    expect(image.tagName).toBe('img');
    expect(image.properties.src).toBe('/path/to/image.png');
    expect(image.properties.border).toBe('false');
  });

  it('correctly converts Image component with border={true} to Image component', () => {
    const doc = '<Image src="/path/to/image.png" border={true} />';

    const hast = mdxish(doc);
    const image = hast.children[0] as Element;

    expect(image.type).toBe('element');
    expect(image.tagName).toBe('img');
    expect(image.properties.src).toBe('/path/to/image.png');
    expect(image.properties.border).toBe('true');
  });
});
