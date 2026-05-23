import type { CustomComponents } from '../../types';
import type { Root } from 'hast';
import type { Transformer } from 'unified';
interface Options {
    components: CustomComponents;
    processMarkdown: (markdownContent: string) => Root;
}
/**
 * Identifies custom MDX components and recursively parses markdown children.
 * Replaces tagName with PascalCase component name for React component resolution.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 * @param {Options} options - Configuration options
 * @param {CustomComponents} options.components - Available custom components
 * @param {Function} options.processMarkdown - Function to process markdown content
 * @returns {Transformer<Root, Root>} The transformer function
 */
export declare const rehypeMdxishComponents: ({ components, processMarkdown }: Options) => Transformer<Root, Root>;
export {};
