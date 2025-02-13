import type { ImageBlock } from '../../types';
import type { Node, Paragraph, Parents, Image } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';
import { mdast } from '../../lib';
import { getAttrs } from '../utils';

const isImage = (node: Node): node is Image => node.type === 'image';

const imageTransformer = () => (tree: Node) => {
  visit(tree, 'paragraph', (node: Paragraph, i: number, parent: Parents) => {
    // check if inline
    if (parent.type !== 'root' || node.children?.length > 1) return;

    const child = node.children[0];
    if (!isImage(child)) return;

    const { alt, url, title } = child;

    const attrs = {
      alt,
      title,
      children: [],
      src: url,
    };

    const newNode: ImageBlock = {
      type: NodeTypes.imageBlock,
      ...attrs,
      /*
       * @note: Using data.hName here means that we don't have to transform
       * this to an MdxJsxFlowElement, and rehype will transform it correctly
       */
      data: {
        hName: 'img',
        hProperties: attrs,
      },
      position: node.position,
    };

    parent.children.splice(i, 1, newNode);
  });

  const isImageBlock = (node: MdxJsxFlowElement) => node.name === 'Image';

  visit(tree, isImageBlock, (node: MdxJsxFlowElement) => {
    const attrs = getAttrs<ImageBlock>(node);

    if (attrs.caption) {
      // @ts-expect-error - @todo: figure out how to coerce RootContent[] to
      // the correct type
      node.children = mdast(attrs.caption).children;
    }
  });

  return tree;
};

export default imageTransformer;
