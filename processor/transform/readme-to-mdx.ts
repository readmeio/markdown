import { Image, Parent } from 'mdast';
import { NodeTypes } from '../../enums';
import { Transform } from 'mdast-util-from-markdown';
import { MdxJsxAttribute } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';
import { toAttributes } from '../utils';
import { type HTMLBlock } from 'types';

const imageAttrs = ['align', 'alt', 'caption', 'border', 'height', 'src', 'title', 'width', 'lazy', 'className'];

const readmeToMdx = (): Transform => tree => {
  // Unwrap pinned nodes, replace rdme-pin with its child node
  visit(tree, 'rdme-pin', (node: Parent, i, parent) => {
    const newNode = node.children[0];
    parent.children.splice(i, 1, newNode);
  });

  visit(tree, NodeTypes.tutorialTile, (tile, index, parent) => {
    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'TutorialTile',
      attributes: toAttributes(tile, ['backgroundColor', 'emoji', 'id', 'link', 'slug', 'title']),
      children: [],
    });
  });

  visit(tree, 'figure', (figure, index, parent) => {
    const [image, caption] = figure.children;

    const { align, width } = image.data.hProperties;
    const border = image.data.hProperties.className === 'border';

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'Image',
      attributes: toAttributes(
        { ...image, align, width, ...(border && { border }), src: image.src || image.url },
        imageAttrs,
      ),
      children: caption.children,
    });
  });

  const hasExtra = (attributes: MdxJsxAttribute[]) =>
    !!attributes.find(attr => !['alt', 'src', 'title'].includes(attr.name));

  visit(tree, 'image', (image, index, parent) => {
    if (!('data' in image)) return;

    if ('url' in image) image.data.hProperties.src = image.url;
    const attributes = toAttributes(image.data.hProperties, imageAttrs);

    if (image.data.hProperties.className === 'emoji') {
      parent.children.splice(index, 1, {
        type: NodeTypes.emoji,
        name: image.title.replace(/^:(.*):$/, '$1'),
        value: image.title,
      });
    } else if (hasExtra(attributes)) {
      parent.children.splice(index, 1, {
        type: 'mdxJsxFlowElement',
        name: 'Image',
        attributes,
        children: [],
      });
    }
  });

  visit(tree, NodeTypes.imageBlock, (image, index, parent) => {
    const attributes = toAttributes(image.data.hProperties, imageAttrs);

    if (hasExtra(attributes)) {
      parent.children.splice(index, 1, {
        type: 'mdxJsxFlowElement',
        name: 'Image',
        attributes,
        children: [],
      });
    } else {
      parent.children.splice(index, 1, {
        type: 'image',
        children: [],
        ...(image.src && { url: image.src }),
        ...(image.title && { title: image.title }),
        ...(image.alt && { alt: image.alt }),
      } as Image);
    }
  });

  visit(tree, 'html', (node, index, parent) => {
    const html = node.value;
    const isScriptOrStyleTag = [!!html.match(/^<(?:style|script)/i), !!html.match(/<\/(?:style|script)>$/i)];
    if (!isScriptOrStyleTag.includes(true)) return;
    parent.children.splice(index, 1, {
      type: 'html-block',
      children: [{ type: 'text', value: html }],
      data: {
        hName: 'html-block',
        hProperties: { html },
      },
    } as HTMLBlock);
  });

  return tree;
};

export default readmeToMdx;
