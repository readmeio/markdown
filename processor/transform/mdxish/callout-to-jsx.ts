import type { Callout } from '../../../types';
import type { Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { defaultIcons, themes } from '../../../components/Callout';
import { NodeTypes } from '../../../enums';
import { toAttributes } from '../../utils';

/**
 * A body-only callout keeps an empty placeholder paragraph in the title slot
 * (see `transformCallout` in mdxish-jsx-to-mdast). We drop it on the way out so
 * re-parsing re-derives `empty` from the absence of a leading heading.
 */
const isEmptyTitleSlot = (node: Callout['children'][number]): boolean =>
  node?.type === 'paragraph' && node.children.every(child => child.type === 'text' && child.value.trim() === '');

/**
 * Serializes mdxish callouts to JSX `<Callout>` syntax unconditionally, so icon
 * and theme selections always persist. This is the inverse of `transformCallout`
 * in mdxish-jsx-to-mdast.
 */
const mdxishCalloutToJsx = (): Transform => tree => {
  visit(tree, NodeTypes.callout, (node: Callout, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    let { icon, theme } = node.data.hProperties;
    if (!icon && theme) icon = defaultIcons[theme];
    if (!theme && icon) theme = themes[icon] || 'default';

    // Mutate in place to keep the children array identity so nested callouts in
    // the body are still visited and converted.
    if (node.data.hProperties.empty && isEmptyTitleSlot(node.children[0])) {
      node.children.shift();
    }

    const jsx: MdxJsxFlowElement = {
      type: 'mdxJsxFlowElement',
      name: 'Callout',
      attributes: toAttributes({ ...(icon && { icon }), ...(theme && { theme }) }, ['icon', 'theme']),
      children: node.children,
      position: node.position,
    };

    parent.children[index] = jsx;
  });

  return tree;
};

export default mdxishCalloutToJsx;
