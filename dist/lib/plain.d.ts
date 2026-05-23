import type { Nodes } from 'hast';
interface Options {
    /**
     * When true, preserves variable syntax instead of resolving to values or bare
     * key names. Legacy variables (from `<<key>>` syntax) output as `<<key>>`,
     * MDX variables output as `{user.key}` for valid identifiers or
     * `{user["key"]}` for non-identifier keys (e.g. hyphens). Used by search
     * indexing so the frontend can interpolate variables at display time with
     * their respective regexes.
     */
    preserveVariableSyntax?: boolean;
    /**
     * Separator to use when joining sibling nodes.
     * Defaults to a space for document-level plain text extraction.
     * Use an empty string for inline-only contexts like TOC labels, where
     * adjacent inline siblings should preserve authored adjacency.
     */
    separator?: string;
    variables?: Record<string, string>;
}
declare const plain: (node: Nodes, opts?: Options) => string | number | true | (string | number)[];
export default plain;
