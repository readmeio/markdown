import type { Node } from 'mdast';
declare const codeTabsTransformer: ({ copyButtons }?: {
    copyButtons?: boolean;
}) => (tree: Node) => Node;
export default codeTabsTransformer;
