import type { Root } from 'mdast';
export declare const MDX_COMMENT_REGEX: RegExp;
/**
 * A remark plugin to remove comments from Markdown and MDX.
 */
export declare const stripCommentsTransformer: () => (tree: Root) => void;
