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

    const newNode = {
      type: NodeTypes.imageBlock,
      alt,
      title,
      url,
      children: [],
      data: {
        hName: 'img',
        hProperties: {
          ...(alt && { alt }),
          src: url,
          ...(title && { title }),
        },
      },
      position: node.position,
    } as ImageBlock;

    parent.children.splice(i, 1, newNode);
  });

  const isImage = (node: MdxJsxFlowElement) => node.name === 'Image';

  visit(tree, isImage, (node: MdxJsxFlowElement) => {
    const attrs = getAttrs<ImageBlock['data']['hProperties']>(node);

    if (attrs.caption) {
      node.children = mdast(attrs.caption).children;
    }
  });

  return tree;
};

export default imageTransformer;

