import type { Figure, Gemoji, ImageBlock, ImageBlockAttrs } from '../../../types';
import type { Image } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Parent } from 'unist';

import { toMarkdown } from 'mdast-util-to-markdown';
import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { toAttributes } from '../../utils';

const IMAGE_ATTRS = ['align', 'alt', 'border', 'caption', 'className', 'height', 'lazy', 'src', 'title', 'width'];
/** The three attributes markdown's `![alt](src "title")` can carry. Anything else forces JSX. */
const PLAIN_IMAGE_ATTRS = ['alt', 'src', 'title'];
const EMOJI_COLONS = /^:(.*):$/;

/** An mdast `image` that picked up readme attributes (align, width, a border class) while parsing. */
interface ReadmeImage extends Image {
  data?: Image['data'] & { hProperties?: ImageBlockAttrs };
}

const hasExtra = (attributes: MdxJsxAttribute[]) => attributes.some(attr => !PLAIN_IMAGE_ATTRS.includes(attr.name));

const toImageJsx = (attributes: MdxJsxAttribute[], children: MdxJsxFlowElement['children'] = []): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'Image',
  attributes,
  children,
});

/**
 * Serializes the three image shapes a parsed document carries. An image that picked up readme
 * attributes has no markdown spelling left and goes out as `<Image>`, a plain one stays
 * `![alt](src)`.
 *
 * Order matters: `figure` unwraps into the `image` its caption belongs to, so it runs first.
 */
const imagesToJsx = (): Transform => tree => {
  visit(tree, NodeTypes.figure, (node: Figure, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const [image, caption] = node.children;
    const { align, className, width } = image.data.hProperties;

    parent.children[index] = toImageJsx(
      toAttributes(
        { ...image, align, width, ...(className === 'border' && { border: true }), src: image.src || image.url },
        IMAGE_ATTRS,
      ),
      // The caption stays a child rather than a pre-serialized `caption` attribute, so readme nodes
      // inside it (emoji, variables, glossary) reach their own handlers instead of the bare
      // `toMarkdown` in `compatibility.figureToImageBlock`, which throws on them.
      caption.children,
    );
  });

  visit(tree, 'image', (node: ReadmeImage, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const hProperties = node.data?.hProperties;
    if (!hProperties) return;

    // A `:joy:`-style shortcode round-trips as a gemoji rather than the image it parsed into.
    if (hProperties.className === 'emoji' && node.title) {
      const emoji: Gemoji = {
        type: NodeTypes.emoji,
        name: node.title.replace(EMOJI_COLONS, '$1'),
        value: node.title,
      };
      parent.children[index] = emoji;
      return;
    }

    const attributes = toAttributes({ ...node, ...hProperties, src: node.url }, IMAGE_ATTRS);
    if (hasExtra(attributes)) parent.children[index] = toImageJsx(attributes);
  });

  visit(tree, NodeTypes.imageBlock, (node: ImageBlock, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    // An image-block keeps its caption as children, so it has to be re-serialized back into the
    // `caption` attribute before the node is replaced.
    const captionChildren = node.children ?? [];
    const caption = captionChildren.length ? toMarkdown({ type: 'root', children: captionChildren }).trim() : '';
    const attributes = toAttributes({ ...node, ...node.data.hProperties, ...(caption && { caption }) }, IMAGE_ATTRS);

    if (hasExtra(attributes)) {
      parent.children[index] = toImageJsx(attributes);
      return;
    }

    const plain: Image = {
      type: 'image',
      url: node.src,
      ...(node.title && { title: node.title }),
      ...(node.alt && { alt: node.alt }),
    };
    parent.children[index] = plain;
  });

  return tree;
};

export default imagesToJsx;
