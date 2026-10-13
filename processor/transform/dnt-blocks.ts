import type { Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

/**
 * Renders a block `<DNT>` as `<div translate="no">`. It holds paragraphs, and the
 * `DNT` component's span cant hold those. Inline `<DNT>` keeps the span.
 */
const dntBlocksToDiv: Plugin<[], Root> = () => tree => {
  visit(tree, 'mdxJsxFlowElement', (node: MdxJsxFlowElement) => {
    // mdxish only makes a flow `<DNT>` from an opener alone on its line, and leaves an empty one as html.
    if (node.name !== 'DNT' || !node.children.length) return;

    node.name = 'div';
    node.attributes = [{ type: 'mdxJsxAttribute', name: 'translate', value: 'no' }];
  });
};

export default dntBlocksToDiv;
