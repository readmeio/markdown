import type { Anchor } from '../../../types';
import type { Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { getHProps, toAttributes } from '../../utils';

/**
 * Serializes mdxish anchors to JSX `<Anchor>` syntax. Handing the node to
 * `mdast-util-mdx-jsx` runs the label through the document's own serializer
 * state, so readme nodes (variables, emoji, glossary) reach their handlers.
 */
const mdxishAnchorToJsx = (): Transform => tree => {
  visit(tree, NodeTypes.anchor, (node: Anchor, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const { href, label, target, title } = getHProps<Anchor['data']['hProperties']>(node);

    const jsx: MdxJsxTextElement = {
      type: 'mdxJsxTextElement',
      name: 'Anchor',
      // An anchor always renders an `href`, even an empty one, so it's built
      // directly rather than through `toAttributes`, which drops empty values.
      attributes: [
        ...toAttributes({ label, target }),
        { type: 'mdxJsxAttribute', name: 'href', value: href ?? '' },
        ...toAttributes({ title }),
      ],
      children: node.children,
      position: node.position,
    };

    parent.children[index] = jsx;
  });

  return tree;
};

export default mdxishAnchorToJsx;
