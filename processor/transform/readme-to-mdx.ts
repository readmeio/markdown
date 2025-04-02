import type { Image, Parent, Node } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import type { Variable, HTMLBlock } from 'types';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';
import { toAttributes } from '../utils';

const imageAttrs = ['align', 'alt', 'caption', 'border', 'height', 'src', 'title', 'width', 'lazy', 'className'];

const readmeToMdx = (): Transform => tree => {
  // Unwrap pinned nodes, replace rdme-pin with its child node
  visit(tree, 'rdme-pin', (node: Parent, i, parent) => {
    const newNode = node.children[0];
    parent.children.splice(i, 1, newNode);
  });

  visit(tree, NodeTypes.tutorialTile, (tile, index, parent) => {
    const { ...attrs } = tile;

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'TutorialTile',
      attributes: toAttributes(attrs, ['backgroundColor', 'emoji', 'id', 'link', 'slug', 'title']),
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

  const isVariable = (node: Node): node is Variable => 'type' in node && node.type === NodeTypes.variable;
  visit(tree, isVariable, (node, index, parent) => {
    const identifier = (node.data.hProperties.variable || node.data.hProperties.name).toString();
    const validIdentifier = identifier.match(/^(\p{Letter}|[$_])(\p{Letter}|[$_0-9])*$/u);
    const value = validIdentifier ? `user.${identifier}` : `user[${JSON.stringify(identifier)}]`;

    const mdxFlowExpression = {
      type: 'mdxFlowExpression',
      value,
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'MemberExpression',
                object: {
                  type: 'Identifier',
                  name: 'user',
                },
                property: {
                  type: 'Identifier',
                  name: identifier,
                },
                computed: false,
                optional: false,
              },
            },
          ],
          sourceType: 'module',
          comments: [],
        },
      },
    };

    // @ts-expect-error -- I have no idea why our mdast types don't always work
    parent.children.splice(index, 1, mdxFlowExpression);
  });

  return tree;
};

export default readmeToMdx;
