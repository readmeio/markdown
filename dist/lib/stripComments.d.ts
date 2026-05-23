interface Opts {
    mdx?: boolean;
    mdxish?: boolean;
}
/**
 * Removes Markdown and MDX comments.
 */
declare function stripComments(doc: string, { mdx, mdxish }?: Opts): Promise<string>;
export default stripComments;
