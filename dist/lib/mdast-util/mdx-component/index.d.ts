import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
/**
 * mdast-util bridge for the `mdxComponent` micromark construct.
 *
 * Emits an opaque `html` mdast node containing the full serialized component
 * source text. The point of this is to just capture the entire component source text
 * and not have it split up into multiple nodes, which is tricky to achieve
 * given the fact that there can be a wide range of formatting variations
 * (e.g. multiline components, inline components, indents, whitspaces in between tags, etc.)
 * A tokenizer is a robust way to capture these variations.
 *
 * Later on, there will be a transformer that will parse the the outputed html node,
 * extract the component name, attributes, and children, and convert it into an `mdxJsxFlowElement` node.
 */
export declare function mdxComponentFromMarkdown(): FromMarkdownExtension;
