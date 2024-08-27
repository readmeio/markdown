import { Image, Parent } from 'mdast';
import { NodeTypes } from '../../enums';
import { Transform } from 'mdast-util-from-markdown';
import { MdxJsxAttribute } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';
import { toAttributes } from '../utils';
import { type HTMLBlock } from 'types';

const imageAttrs = ['align', 'alt', 'caption', 'border', 'src', 'title', 'width', 'lazy', 'className'];

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

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'Image',
      attributes: toAttributes(image, imageAttrs),
      children: caption.children,
    });
  });

  const hasExtra = (attributes: MdxJsxAttribute[]) =>
    !!attributes.find(attr => !['alt', 'src', 'title'].includes(attr.name));

  visit(tree, 'image', (image, index, parent) => {
    if (!('data' in image)) return;

    if ('url' in image) image.data.hProperties.src = image.url;
    const attributes = toAttributes(image.data.hProperties, imageAttrs);

    if (hasExtra(attributes)) {
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
        url: image.url,
        title: image.title,
        alt: image.alt,
      } as Image);
    }
  });

  visit(tree, 'html', (node, index, parent) => {
    const html = node.value;
    const isScriptOrStyleTag = [!!html.match(/^<(?:style|script).*?>/), !!html.match(/<\/(?:style|script)>$/)];
    if (!isScriptOrStyleTag.includes(true)) return;
    parent.children.splice(index, 1, {
      type: 'html-block',
      children: [{ type: 'text', value: html }],
      data: {
        hName: 'html-block',
        hProperties: {
          html,
          // runScripts: options.compatibilityMode, // not sure how to access the global options anymore!
        },
      },
    } as HTMLBlock);
  });

  return tree;
};

export default readmeToMdx;
