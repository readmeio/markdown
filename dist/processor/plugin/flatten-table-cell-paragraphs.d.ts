import type { Root } from 'hast';
import type { Transformer } from 'unified';
/**
 * Rehype plugin that flattens paragraph elements that are adjacent to lists in table cells.
 *
 * When markdown content is parsed inside JSX table cells, text before/after lists
 * gets wrapped in `<p>` tags. This causes unwanted spacing because both `<p>` and
 * list elements have margins.
 *
 * This plugin selectively unwraps only `<p>` elements that are immediately before
 * or after a list (`<ul>` or `<ol>`), preserving paragraphs in other contexts.
 */
export declare const rehypeFlattenTableCellParagraphs: () => Transformer<Root, Root>;
