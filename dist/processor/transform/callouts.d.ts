import type { Blockquote, Heading, Root } from 'mdast';
import type { Callout } from 'types';
export declare const wrapHeading: (node: Blockquote | Callout) => Heading;
declare const calloutTransformer: ({ isMdxish }?: {
    isMdxish?: boolean;
}) => (tree: Root) => void;
export default calloutTransformer;
