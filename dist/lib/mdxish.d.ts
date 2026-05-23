import type { CustomComponents, Variables } from '../types';
import type { Root } from 'hast';
import type { Root as MdastRoot } from 'mdast';
export interface MdxishOpts {
    components?: CustomComponents;
    newEditorTypes?: boolean;
    /**
     * When enabled, the pipeline ignores all expression syntax `{...}`.
     * This disables:
     * - JSX attribute expression evaluation (e.g., `href={baseUrl}`)
     * - MDX expression parsing (e.g., `{1 + 1}`)
     * - Expression node evaluation
     *
     * Expressions will remain as literal text in the output.
     */
    safeMode?: boolean;
    useTailwind?: boolean;
    variables?: Variables;
}
export declare function mdxishAstProcessor(mdContent: string, opts?: MdxishOpts): {
    processor: import("unified").Processor<MdastRoot, import("unist").Node, import("unist").Node, undefined, undefined>;
    /**
     * @todo we need to return this transformed content for now
     * but ultimately need to properly tokenize our special markdown syntax
     * into hast nodes instead of relying on transformed content
     */
    parserReadyContent: string;
};
/**
 * Serializes an Mdast back into a markdown string.
 */
export declare function mdxishMdastToMd(mdast: MdastRoot): string;
/**
 * Processes markdown content with MDX syntax support and returns a HAST.
 * Detects and renders custom component tags from the components hash.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
export declare function mdxish(mdContent: string, opts?: MdxishOpts): Root;
export default mdxish;
