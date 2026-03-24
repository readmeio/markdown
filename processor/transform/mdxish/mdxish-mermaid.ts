import type { Root, Element } from 'hast';

import { visit } from 'unist-util-visit';

/**
 * Rehype plugin for mdxish pipeline to add mermaid-render className to mermaid code blocks.
 * The mermaid-render class is used to identify the mermaid diagrams elements for the
 * mermaid library to transform. See components/CodeTabs/index.tsx for context
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
      // Combine existing className with the new mermaid-render class
      const existingClassName = node.properties?.className;
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

