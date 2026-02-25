import type { Element, Root, Text } from 'hast';

import { visit } from 'unist-util-visit';

/**
 * Rehype transformer that strips backslash-escaped braces from `<code>` elements.
 *
 * The `escapeUnbalancedBraces` preprocessor adds `\` before unbalanced `{` and `}`
 * to prevent MDX expression parsing errors. This works in MDX text (where `\{` renders
 * as `{`), but inside HTML blocks the `\` passes through as literal text and shows up
 * in the rendered output.
 *
 * This transformer runs after `rehypeRaw` (when HTML blocks have been parsed into proper
 * hast elements) and removes those stray backslashes from `<code>` element text content.
 */
const cleanEscapedBracesInCode = () => (tree: Root) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'code') return;

    node.children.forEach(child => {
      if (child.type === 'text') {
        (child as Text).value = (child as Text).value.replace(/\\([{}])/g, '$1');
      }
    });
  });

  return tree;
};

export default cleanEscapedBracesInCode;
