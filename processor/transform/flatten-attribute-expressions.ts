import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { isMDXElement } from '../utils';

/**
 * Rewrites JSX attribute expressions (`icon={String(1 + 3)}`) into plain string attributes
 * holding their literal source, so nothing downstream can evaluate them.
 *
 * This is the RMDX counterpart to mdxish's `preserveExpressionsAsText` parse option: safeMode's
 * contract is enforced once, at the head of the pipeline, rather than at every `getAttrs()` call
 * site. Only registered when safeMode is on.
 */
const flattenAttributeExpressions = (): Transform => tree => {
  visit(tree, isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    node.attributes.forEach(attr => {
      if (!('name' in attr)) return;
      if (attr.value === null || typeof attr.value === 'string') return;

      attr.value = attr.value.value;
    });
  });

  return tree;
};

export default flattenAttributeExpressions;
