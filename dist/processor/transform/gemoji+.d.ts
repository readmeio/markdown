import type { Root } from 'mdast';
export declare const regex: RegExp;
declare const gemojiTransformer: () => (tree: Root) => Root;
export default gemojiTransformer;
