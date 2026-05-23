import type { SnakeCaseMapping } from './components/snake-case-components';
import type { Parent } from 'mdast';
import type { Plugin } from 'unified';
interface Options {
    mapping: SnakeCaseMapping;
}
/**
 * Restores snake_case component names from placeholders after parsing.
 * Runs after mdxishComponentBlocks converts HTML nodes to mdxJsxFlowElement.
 */
declare const restoreSnakeCaseComponentNames: Plugin<[Options], Parent>;
export default restoreSnakeCaseComponentNames;
