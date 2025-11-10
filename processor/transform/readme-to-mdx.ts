import type { Image, Parent, Node, Link, Paragraph } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxFlowExpression } from 'mdast-util-mdx';
import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import type { Variable, HTMLBlock, Recipe } from 'types';

import emojiRegex from 'emoji-regex';
import { visit } from 'unist-util-visit';

import { defaultIcons, themes } from '../../components/Callout';
import { NodeTypes } from '../../enums';
import { toAttributes } from '../utils';

const imageAttrs = ['align', 'alt', 'caption', 'border', 'height', 'src', 'title', 'width', 'lazy', 'className'];

const readmeToMdx = (): Transform => tree => {
  // Unwrap pinned nodes, replace rdme-pin with its child node
  visit(tree, 'rdme-pin', (node: Parent, i, parent) => {
    const newNode = node.children[0];
    parent.children.splice(i, 1, newNode);
  });

  visit(tree, 'rdme-callout', (node, index, parent) => {
    const isEmpty = node.data.hProperties?.empty;
    const isH3 = node.children?.[0] && 'type' in node.children[0] && node.children[0].type === 'heading' && node.children[0].depth === 3;
    let { icon, theme } = node.data.hProperties;
    if (!icon) icon = defaultIcons[theme];
    if (!theme) theme = themes[icon] || 'default';
    const isEmoji = emojiRegex().test(icon);

    // return the usual markdown if there is an emoji and the icon theme matches our default theme
    if ((isEmpty || isH3) && isEmoji && themes[icon] === theme) {
      if (isH3) {
        node.children[0] = {
          type: 'paragraph',
          children: 'children' in node.children[0] ? node.children[0].children : [],
        } as Paragraph;
      }

      node.data.hProperties.icon = icon;
      node.data.hProperties.theme = theme;

      return;
    }

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'Callout',
      attributes: toAttributes(node.data.hProperties, ['icon', isEmpty && 'empty', 'theme'].filter(Boolean)),
      children: node.children,
    });
  });

  // Converts tutorial tiles to Recipe components in the migration process
  // Retaining this for backwards compatibility
  visit(tree, NodeTypes.tutorialTile, (tile, index, parent: Parent) => {
    const { ...attrs } = tile as Recipe;

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'Recipe',
      attributes: toAttributes(attrs, ['slug', 'title']),
      children: [],
    });
  });

  visit(tree, NodeTypes.recipe, (tile, index, parent: Parent) => {
    const { ...attrs } = tile as Recipe;

    parent.children.splice(index, 1, {
      type: 'mdxJsxFlowElement',
      name: 'Recipe',
      attributes: toAttributes(attrs, ['slug', 'title']),
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
    const attributes = toAttributes({ ...image, ...image.data.hProperties }, imageAttrs);

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
    const attributes = toAttributes({ ...image, ...image.data.hProperties }, imageAttrs);

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

  const hasExtraLinkAttrs = (attributes: MdxJsxAttribute[]) =>
    !!attributes.find(attr => !['href', 'label'].includes(attr.name));

  // converts links with extra attributes to Anchor elements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  visit(tree, 'link', ({ type, children, position, ...attrs }: Link & { href?: string }, index, parent) => {
    if ('url' in attrs) {
      attrs.href = attrs.url;
      delete attrs.url;
    }

    const attributes = toAttributes(attrs);

    if (hasExtraLinkAttrs(attributes)) {
      parent.children.splice(index, 1, {
        type: 'mdxJsxTextElement',
        name: 'Anchor',
        attributes,
        children,
        position,
      });
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

    const mdxFlowExpression: MdxFlowExpression = {
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

    parent.children.splice(index, 1, mdxFlowExpression);
  });

  return tree;
};

export default readmeToMdx;
