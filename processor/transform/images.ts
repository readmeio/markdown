import { visit } from 'unist-util-visit';
import { Node, Paragraph, Parents } from 'mdast';
import { MdxJsxFlowElement } from 'mdast-util-mdx';

import { NodeTypes } from '../../enums';
import { ImageBlock } from '../../types';
import { getAttrs } from '../utils';
import { mdast } from '../../lib';

const imageTransformer = () => (tree: Node) => {
  visit(tree, 'paragraph', (node: Paragraph, i: number, parent: Parents) => {
    // check if inline
    if (parent.type !== 'root' || node.children?.length > 1 || node.children[0].type !== 'image') return;

    const [{ alt, url, title }] = node.children as any;

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

  const isImage = (node: MdxJsxFlowElement) => node.name === 'Image';

  visit(tree, isImage, (node: MdxJsxFlowElement) => {
    const attrs = getAttrs<ImageBlock>(node);

    if (attrs.caption) {
      node.children = mdast(attrs.caption).children;
    }
  });

  return tree;
};

export default imageTransformer;
