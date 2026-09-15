import type { Figure, Gemoji, ImageBlock } from '../../types';
import type { Image, Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import imagesToJsx from '../../processor/transform/mdxish/images-to-jsx';

const run = (children: Root['children']): Root => {
  const tree: Root = { type: 'root', children };
  imagesToJsx()(tree);
  return tree;
};

const attr = (node: MdxJsxFlowElement, name: string) => node.attributes.find(a => 'name' in a && a.name === name)?.value;

describe('images-to-jsx transformer', () => {
  it('rewrites a figure into an Image element with the caption as children', () => {
    const figure = {
      type: 'figure',
      children: [
        {
          type: 'image-block',
          src: 'https://x.io/a.png',
          url: 'https://x.io/a.png',
          alt: 'Alt',
          data: { hProperties: { align: 'center', className: 'border', width: '80%' } },
        },
        { type: 'figcaption', children: [{ type: 'text', value: 'A caption' }] },
      ],
    } as unknown as Figure;

    const [image] = run([figure]).children as [MdxJsxFlowElement];

    expect(image.type).toBe('mdxJsxFlowElement');
    expect(image.name).toBe('Image');
    expect(attr(image, 'src')).toBe('https://x.io/a.png');
    expect(attr(image, 'align')).toBe('center');
    expect(attr(image, 'width')).toBe('80%');
    // `className: 'border'` becomes the `border` prop, not a class
    expect(attr(image, 'border')).toBeDefined();
    // The caption stays child content so readme nodes inside it reach their own handlers
    expect(image.children).toStrictEqual([{ type: 'text', value: 'A caption' }]);
  });

  it('rewrites an image-block with readme attributes into an Image element', () => {
    const block = {
      type: 'image-block',
      src: 'https://x.io/a.png',
      alt: 'Alt',
      data: { hProperties: { align: 'left', width: '50%' } },
      children: [{ type: 'text', value: 'Cap' }],
    } as unknown as ImageBlock;

    const [image] = run([block]).children as [MdxJsxFlowElement];

    expect(image.name).toBe('Image');
    expect(attr(image, 'align')).toBe('left');
    // The image-block caption is re-serialized into the `caption` attribute
    expect(attr(image, 'caption')).toBe('Cap');
  });

  it('rewrites an attribute-less image-block into a plain markdown image', () => {
    const block = {
      type: 'image-block',
      src: 'https://x.io/a.png',
      alt: 'Alt',
      title: 'Title',
      data: { hProperties: {} },
      children: [],
    } as unknown as ImageBlock;

    const [image] = run([block]).children as [Image];

    expect(image).toStrictEqual({
      type: 'image',
      url: 'https://x.io/a.png',
      title: 'Title',
      alt: 'Alt',
    });
  });

  it('rewrites an inline image that picked up readme attributes into an Image element', () => {
    const inline: Image = {
      type: 'image',
      url: 'https://x.io/a.png',
      alt: 'Alt',
      data: { hProperties: { width: '200px' } },
    };

    const [paragraph] = run([{ type: 'paragraph', children: [inline] }]).children as [{ children: MdxJsxFlowElement[] }];
    const [image] = paragraph.children;

    expect(image.name).toBe('Image');
    expect(attr(image, 'width')).toBe('200px');
  });

  it('turns a :shortcode: image back into a gemoji node', () => {
    const emoji: Image = {
      type: 'image',
      url: '/public/img/emojis/joy.png',
      title: ':joy:',
      data: { hProperties: { className: 'emoji' } },
    };

    const [paragraph] = run([{ type: 'paragraph', children: [emoji] }]).children as [{ children: Gemoji[] }];

    expect(paragraph.children[0]).toMatchObject({ type: 'gemoji', name: 'joy', value: ':joy:' });
  });

  it('leaves a plain markdown image untouched', () => {
    const plain: Image = { type: 'image', url: 'https://x.io/a.png', alt: 'Alt' };
    const paragraph = { type: 'paragraph', children: [plain] } as const;

    const [result] = run([paragraph]).children as [typeof paragraph];

    expect(result.children[0]).toBe(plain);
  });
});
