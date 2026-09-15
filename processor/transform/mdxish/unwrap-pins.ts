import type { Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { visit } from 'unist-util-visit';

/**
 * The mdxish dialect has no spelling for a pinned block, so a parsed `rdme-pin` wrapper
 * serializes as its content — matching how `readmeToMdx` has always unwrapped pins.
 */
const unwrapPins = (): Transform => tree => {
  visit(tree, 'rdme-pin', (node: Parent, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    parent.children.splice(index, 1, ...node.children);
  });

  return tree;
};

export default unwrapPins;
