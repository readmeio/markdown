import type { Root } from 'mdast';
import type { Plugin } from 'unified';
/**
 * AST transformer to evaluate MDX expressions.
 * Replaces mdxFlowExpression and mdxTextExpression nodes with their evaluated values.
 * Self-contained expressions resolve directly (e.g. `{1+1}`); expressions that
 * reference identifiers can resolve if those identifiers were introduced by an
 * earlier `export const/function` (collected onto `file.data.mdxishScope`).
 * Anything else falls through to the error branch and is kept as literal `{...}` text.
 */
declare const evaluateExpressions: Plugin<[], Root>;
export default evaluateExpressions;
