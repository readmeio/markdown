import type { LinkReference, Root } from 'mdast';
import type { Plugin } from 'unified';
declare const migrateLinkReferences: Plugin<[{
    rdmd: {
        md: (node: LinkReference) => string;
    };
}], Root>;
export default migrateLinkReferences;
