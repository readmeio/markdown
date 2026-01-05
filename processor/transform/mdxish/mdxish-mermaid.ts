import type { Root, Element } from 'hast';

import { visit } from 'unist-util-visit';

/**
 * Rehype plugin for mdxish pipeline to add mermaid-render className to pre wrappers
 * containing mermaid code blocks. This runs after MDAST -> HAST conversion.
 */
const mdxishMermaidTransformer = () => (tree: Root) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'pre' || node.children.length !== 1) return;

    const [child] = node.children;
    if (
      child.type === 'element' &&
      child.tagName === 'code' &&
      child.properties?.lang === 'mermaid'
    ) {
      const existingClassName = node.properties?.className;
      // Normalize className to array, filter out non-string/number values
      const classNameArray = Array.isArray(existingClassName)
        ? existingClassName.filter(c => typeof c === 'string' || typeof c === 'number')
        : existingClassName && (typeof existingClassName === 'string' || typeof existingClassName === 'number')
          ? [existingClassName]
          : [];

      node.properties = {
        ...node.properties,
        className: ['mermaid-render', ...classNameArray],
      };
    }
  });

  return tree;
};

export default mdxishMermaidTransformer;

