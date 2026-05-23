import type { Root } from 'hast';
/**
 * Rehype plugin for mdxish pipeline to add mermaid-render className to mermaid code blocks.
 * The mermaid-render class is used to identify the mermaid diagrams elements for the
 * mermaid library to transform. See components/CodeTabs/index.tsx for context
 */
declare const mdxishMermaidTransformer: () => (tree: Root) => Root;
export default mdxishMermaidTransformer;
