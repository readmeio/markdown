import type { Node } from 'mdast';
declare const imageTransformer: ({ isMdxish }?: {
    isMdxish?: boolean;
}) => (tree: Node) => Node;
export default imageTransformer;
