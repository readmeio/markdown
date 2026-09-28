import type { Figure, Gemoji, ImageBlock, ImageBlockAttrs } from '../../types';
import type { Image, Paragraph, Root, Table } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { NodeTypes } from '../../enums';
import imagesToJsx from '../../processor/transform/mdxish/images-to-jsx';

const run = (children: Root['children']): Root => {
  const tree: Root = { type: 'root', children };
  imagesToJsx()(tree);
  return tree;
};

const attr = (node: MdxJsxFlowElement, name: string) => node.attributes.find(a => 'name' in a && a.name === name)?.value;

/**
 * An `image-block` carries its attributes on the node and mirrored into `data.hProperties`.
 * The caption `children` are node content rather than an html property, so they stay off `hProperties`.
 */
const imageBlock = ({ children, ...attrs }: ImageBlockAttrs): ImageBlock => ({
  type: NodeTypes.imageBlock,
  ...attrs,
  children,
  data: { hName: 'img', hProperties: { ...attrs } },
});

describe('images-to-jsx transformer', () => {
  it('rewrites a figure into an Image element with the caption as children', () => {
    const caption: Paragraph = { type: 'paragraph', children: [{ type: 'text', value: 'A caption' }] };
    const figure: Figure = {
      type: NodeTypes.figure,
      data: { hName: 'figure' },
      children: [
        {
          ...imageBlock({
            src: 'https://x.io/a.png',
            alt: 'Alt',
            title: '',
            align: 'center',
            className: 'border',
            width: '80%',
          }),
          url: 'https://x.io/a.png',
        },
        { type: NodeTypes.figcaption, data: { hName: 'figcaption' }, children: [caption] },
      ],
    };

    const [image] = run([figure]).children as [MdxJsxFlowElement];

    expect(image.type).toBe('mdxJsxFlowElement');
    expect(image.name).toBe('Image');
    expect(attr(image, 'src')).toBe('https://x.io/a.png');
    expect(attr(image, 'align')).toBe('center');
    expect(attr(image, 'width')).toBe('80%');
    // `className: 'border'` becomes the `border` prop, not a class
    expect(attr(image, 'border')).toBeDefined();
    // The caption stays child content so readme nodes inside it reach their own handlers
    expect(image.children).toStrictEqual([caption]);
  });

  it('rewrites an image-block with readme attributes into an Image element', () => {
    const block = imageBlock({
      src: 'https://x.io/a.png',
      alt: 'Alt',
      title: '',
      align: 'left',
      width: '50%',
      children: [{ type: 'text', value: 'Cap' }],
    });

    const [image] = run([block]).children as [MdxJsxFlowElement];

    expect(image.name).toBe('Image');
    expect(attr(image, 'align')).toBe('left');
    // The image-block caption is re-serialized into the `caption` attribute
    expect(attr(image, 'caption')).toBe('Cap');
  });

  it('rewrites an attribute-less image-block into a plain markdown image', () => {
    const block = imageBlock({ src: 'https://x.io/a.png', alt: 'Alt', title: 'Title', children: [] });

    const [image] = run([block]).children as [Image];

    expect(image).toStrictEqual({
      type: 'paragraph',
      children: [{ type: 'image', url: 'https://x.io/a.png', title: 'Title', alt: 'Alt' }],
    });
  });

  // An `image` is phrasing content. Left bare in a flow slot, the serializer has no rule to
  // separate it from the next block and glues them together (`![a](src)# Heading`).
  it('wraps a flow-position image in a paragraph so it stays its own block', () => {
    const bare: Image = { type: 'image', url: 'https://x.io/a.png', alt: 'Alt' };

    const [wrapped] = run([bare, { type: 'heading', depth: 1, children: [{ type: 'text', value: 'H' }] }])
      .children as [Paragraph];

    expect(wrapped).toStrictEqual({ type: 'paragraph', children: [bare] });
  });

  it('leaves an image inside a table cell unwrapped', () => {
    const cellImage: Image = { type: 'image', url: 'https://x.io/a.png', alt: 'Alt' };
    const table: Table = {
      type: 'table',
      children: [{ type: 'tableRow', children: [{ type: 'tableCell', children: [cellImage] }] }],
    };

    const [result] = run([table]).children as [Table];

    expect(result.children[0].children[0].children[0]).toBe(cellImage);
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
