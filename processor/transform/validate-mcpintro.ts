import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { isMDXElement } from '../utils';

/**
 * Validates that MCPIntro components have a required url attribute.
 * Throws an error during compilation if the attribute is missing.
 */
const validateMCPIntro = (): Transform => tree => {
  visit(tree, isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (node.name !== 'MCPIntro') return;

    const hasUrlAttribute = node.attributes?.some(attr => 'name' in attr && attr.name === 'url');

    if (!hasUrlAttribute) {
      throw new Error(
        'MCPIntro component requires a "url" attribute. Use the component menu in the editor to insert it correctly.',
      );
    }
  });
};

export default validateMCPIntro;
