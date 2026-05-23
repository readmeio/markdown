import compatabilityTransfomer from './compatability';
import divTransformer from './div';
import handleMissingComponents from './handle-missing-components';
import injectComponents from './inject-components';
import mdxToHast from './mdx-to-hast';
import mdxishTables from './mdxish/tables/mdxish-tables';
import mermaidTransformer from './mermaid';
import readmeComponentsTransformer from './readme-components';
import readmeToMdx from './readme-to-mdx';
import tablesToJsx from './tables-to-jsx';
import tailwindTransformer from './tailwind';
import validateMCPIntro from './validate-mcpintro';
import variablesTransformer from './variables';
export { compatabilityTransfomer, divTransformer, injectComponents, mdxToHast, mdxishTables, mermaidTransformer, readmeComponentsTransformer, readmeToMdx, tablesToJsx, tailwindTransformer, handleMissingComponents, validateMCPIntro, variablesTransformer, };
export declare const defaultTransforms: {
    calloutTransformer: ({ isMdxish }?: {
        isMdxish?: boolean;
    }) => (tree: import("mdast").Root) => void;
    codeTabsTransformer: ({ copyButtons }?: {
        copyButtons?: boolean;
    }) => (tree: import("mdast").Node) => import("mdast").Node;
    embedTransformer: () => (tree: import("mdast").Node) => void;
    imageTransformer: ({ isMdxish }?: {
        isMdxish?: boolean;
    }) => (tree: import("mdast").Node) => import("mdast").Node;
    gemojiTransformer: () => (tree: import("mdast").Root) => import("mdast").Root;
};
export declare const mdxishTransformers: ((({ copyButtons }?: {
    copyButtons?: boolean;
}) => (tree: import("mdast").Node) => import("mdast").Node) | (({ isMdxish }?: {
    isMdxish?: boolean;
}) => (tree: import("mdast").Node) => import("mdast").Node) | ((({ isMdxish }?: {
    isMdxish?: boolean;
}) => (tree: import("mdast").Root) => void) | {
    isMdxish: boolean;
})[])[];
declare const _default: ((({ isMdxish }?: {
    isMdxish?: boolean;
}) => (tree: import("mdast").Root) => void) | (({ copyButtons }?: {
    copyButtons?: boolean;
}) => (tree: import("mdast").Node) => import("mdast").Node) | (() => (tree: import("mdast").Node) => void) | (({ isMdxish }?: {
    isMdxish?: boolean;
}) => (tree: import("mdast").Node) => import("mdast").Node) | (() => (tree: import("mdast").Root) => import("mdast").Root))[];
export default _default;
