import type { PluggableList } from 'unified';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
export interface MdastOpts {
    components?: Record<string, string>;
    missingComponents?: 'ignore' | 'throw';
    remarkPlugins?: PluggableList;
}
export declare const remarkPlugins: (typeof remarkFrontmatter | typeof remarkGfm | (({ isMdxish }?: {
    isMdxish?: boolean;
}) => (tree: import("mdast").Root) => void) | (({ copyButtons }?: {
    copyButtons?: boolean;
}) => (tree: import("mdast").Node) => import("mdast").Node))[];
export declare const rehypePlugins: (typeof rehypeSlug | (() => (tree: import("unist").Node) => import("unist").Node))[];
declare const astProcessor: (opts?: MdastOpts) => import("unified").Processor<import("mdast").Root, import("mdast").Root, import("mdast").Root, import("mdast").Root, string>;
export default astProcessor;
