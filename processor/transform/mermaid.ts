import { visit } from 'unist-util-visit';
import { Node } from 'unist';
import { Element } from 'hast';

const mermaidTransformer = () => (tree: Node) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'pre' || node.children.length !== 1) return;

    const [child] = node.children;
    if (child.type === 'element' && child.tagName === 'code' && child.properties.lang === 'mermaid') {
      node.properties = {
        ...node.properties,
        className: ['mermaid', ...((node.properties.className as string[]) || [])],
      };
    }
  });

  return tree;
};

export default mermaidTransformer;