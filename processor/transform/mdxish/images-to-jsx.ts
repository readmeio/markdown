import type { Figure, Gemoji, ImageBlock, ImageBlockAttrs } from '../../../types';
import type { Image, Paragraph } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Parent } from 'unist';

import { toMarkdown } from 'mdast-util-to-markdown';
import { SKIP, visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { INLINE_ONLY_PARENT_TYPES } from '../../../lib/constants';
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
 * An `image` is phrasing content, but the nodes it replaces here (`image-block`, and a plain
 * `[block:image]`) sit where flow content belongs. `mdast-util-to-markdown` picks a block separator
 * from the two node types around it and has no rule for phrasing-next-to-flow, so it emits none and
 * glues the image to whatever follows (`![a](src)# Heading`), which then cascades through the rest
 * of the document. Wrapping restores a block for it to join against.
 */
const placeImage = (parent: Parent, index: number, image: Image): void => {
  const wrapped: Paragraph = { type: 'paragraph', children: [image] };
  parent.children[index] = INLINE_ONLY_PARENT_TYPES.has(parent.type) ? image : wrapped;
};

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

  visit(tree, 'image', (n, index, parent: Parent | undefined) => {
    const node = n as ReadmeImage;
    if (!parent || index === undefined) return undefined;

    const hProperties = node.data?.hProperties;

    // A `:joy:`-style shortcode round-trips as a gemoji rather than the image it parsed into.
    if (hProperties?.className === 'emoji' && node.title) {
      const emoji: Gemoji = {
        type: NodeTypes.emoji,
        name: node.title.replace(EMOJI_COLONS, '$1'),
        value: node.title,
      };
      parent.children[index] = emoji;
      return undefined;
    }

    if (hProperties) {
      const attributes = toAttributes({ ...node, ...hProperties, src: node.url }, IMAGE_ATTRS);
      if (hasExtra(attributes)) {
        parent.children[index] = toImageJsx(attributes);
        return undefined;
      }
    }

    // An attribute-less `[block:image]` parses straight to an `image` in a flow slot, so it needs
    // the same wrap. Editor images always arrive inside a paragraph and are left alone.
    if (INLINE_ONLY_PARENT_TYPES.has(parent.type)) return undefined;

    placeImage(parent, index, node);
    // Step over the paragraph just created, or the visitor walks back into the same image.
    return [SKIP, index + 1];
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

    placeImage(parent, index, {
      type: 'image',
      url: node.src,
      ...(node.title && { title: node.title }),
      ...(node.alt && { alt: node.alt }),
    });
  });

  return tree;
};

export default imagesToJsx;
