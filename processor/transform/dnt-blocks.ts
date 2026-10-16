import type { Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

// Renders a block `<DNT>` (do not translate) as `<div class="readme-dnt" translate="no">`: it holds
// paragraphs, and the `DNT` component's span cant hold those. Inline `<DNT>` keeps the span.
const dntBlocksToDiv: Plugin<[], Root> = () => tree => {
  visit(tree, 'mdxJsxFlowElement', (node: MdxJsxFlowElement) => {
    if (node.name !== 'DNT') return;

    node.name = 'div';
    node.attributes = [
      { type: 'mdxJsxAttribute', name: 'className', value: 'readme-dnt' },
      { type: 'mdxJsxAttribute', name: 'translate', value: 'no' },
    ];
  });
};

export default dntBlocksToDiv;
