import type { Html, PhrasingContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
export type MdxAttributes = (MdxJsxAttribute | MdxJsxExpressionAttribute)[];
/**
 * Unified processor for re-parsing the body of an MDX component
 * Memoized based on the argument value so we don't pay the construction cost on every parse
 * Currently the argument is only safeMode, but we could add more arguments in the future,
 * in which case the key would need to be extend to include the new arguments.
 */
export declare const getInlineMdProcessor: ({ safeMode }?: {
    safeMode?: boolean;
}) => import("unified").Processor<import("mdast").Root, undefined, undefined, undefined, undefined>;
/**
 * True when a tag name starts with an uppercase letter — ReadMe's marker for
 * a custom MDX component (vs a lowercase HTML tag).
 */
export declare const isPascalCase: (tag: string) => boolean;
/**
 * True when the attribute list contains at least one JSX expression value
 * (e.g. `href={url}`). The `mdxComponent` tokenizer only claims lowercase
 * tags when they carry one of these; both block transformers use the same
 * signal to decide eligibility.
 */
export declare const hasExpressionAttr: (attributes: MdxAttributes) => boolean;
/**
 * Factory for the `mdxJsxTextElement` node shape. `position` is optional
 * because the two call sites differ: the tokenized-tag path carries the
 * original html node's position forward, while the sibling-merge path
 * composes children from pre-existing nodes with no outer position.
 */
export declare const toMdxJsxTextElement: (name: string, attributes: MdxAttributes, children: PhrasingContent[], position?: Html["position"]) => MdxJsxTextElement;
