import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList, Variables } from '../../types';
import type { Root } from 'hast';
import type { Transformer } from 'unified';
interface Options {
    components?: CustomComponents;
}
/** Extract all heading elements (h1-h6) from a HAST tree, excluding those inside custom components
 * Used to generate toc for mdxish
 */
export declare function extractToc(tree: Root, components?: CustomComponents): HastHeading[];
/** A rehype plugin to generate a flat list of top-level headings or jsx flow elements. */
export declare const rehypeToc: ({ components }: Options) => Transformer<Root, Root>;
export declare const tocToHast: (headings?: HastHeading[], variables?: Variables) => TocList;
export declare const tocHastToMdx: (toc: IndexableElements[] | undefined, components: Record<string, RMDXModule["toc"]>, variables?: Variables) => string;
export {};
