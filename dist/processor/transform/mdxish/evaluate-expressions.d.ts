import type { Root } from 'mdast';
import type { Plugin } from 'unified';
/**
 * AST transformer to evaluate MDX expressions.
 * Replaces mdxFlowExpression and mdxTextExpression nodes with their evaluated values.
 * Runs with no scope, so only self-contained expressions resolve
 * (e.g. `{1+1}`, `{"hi".toUpperCase()}`); anything that references an external
 * identifier falls through to the error branch and is kept as literal `{...}` text.
 */
declare const evaluateExpressions: Plugin<[], Root>;
export default evaluateExpressions;
