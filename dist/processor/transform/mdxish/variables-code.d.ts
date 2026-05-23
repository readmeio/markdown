import type { Variables } from '../../../types';
import type { Plugin } from 'unified';
interface Options {
    variables?: Variables;
}
/**
 * A remark mdast plugin that resolves legacy variables <<...>> and MDX variables {user.*} inside code and inline code nodes
 * to their values. Uses regexes from the readme variable to search for variables in the code string.
 *
 * This is needed because variables in code blocks and inline cannot be tokenized, and also we need to maintain the code string
 * in the code nodes. This enables engine side variable resolution in codes which improves UX
 */
declare const variablesCodeResolver: Plugin<[Options?]>;
export default variablesCodeResolver;
