import type { Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

// Renders a block `<NoTranslate>` (do not translate) as `<div class="readme-no-translate" translate="no">`: it holds
// paragraphs, and the `NoTranslate` component's span cant hold those. Inline `<NoTranslate>` keeps the span.
const noTranslateBlocksToDiv: Plugin<[], Root> = () => tree => {
  visit(tree, 'mdxJsxFlowElement', (node: MdxJsxFlowElement) => {
    if (node.name !== 'NoTranslate') return;

    node.name = 'div';
    node.attributes = [
      { type: 'mdxJsxAttribute', name: 'className', value: 'readme-no-translate' },
      { type: 'mdxJsxAttribute', name: 'translate', value: 'no' },
    ];
  });
};

export default noTranslateBlocksToDiv;
