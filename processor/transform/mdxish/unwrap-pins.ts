import type { Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { visit } from 'unist-util-visit';

/**
 * A `sidebar: true` magic block (e.g. `[block:code]`) parses into an `rdme-pin` wrapper via
 * `wrapPinnedBlocks`, and remark-stringify throws on any node type without a handler. The mdxish
 * dialect has no spelling for a pin, so the wrapper serializes as its content instead — the same
 * (lossy) unwrap `readmeToMdx` has always done, trading the `sidebar` flag for not crashing.
 */
const unwrapPins = (): Transform => tree => {
  visit(tree, 'rdme-pin', (node: Parent, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    parent.children.splice(index, 1, ...node.children);
  });

  return tree;
};

export default unwrapPins;
