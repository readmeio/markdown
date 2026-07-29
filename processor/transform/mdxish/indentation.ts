/**
 * CommonMark indentation helpers, shared by the mdxish preprocessors so tab- and
 * space-indented content is measured (and sliced) on one scale.
 *
 * CommonMark's indented-code threshold is 4 *columns*, and a tab is a 4-column tab
 * stop — not a fixed 4 characters. Counting characters (tab = 1) under-measures
 * tab-indented lines, letting them slip past the 4-column gate so their content
 * fragments into code blocks. Keeping one implementation here stops the two callers
 * from drifting on what "4 columns" means.
 */

/** The run of leading spaces/tabs on a line. */
export const leadingIndent = (line: string): string => line.match(/^[ \t]*/)?.[0] ?? '';

/**
 * Expand a leading-whitespace run to spaces using CommonMark's 4-column tab stops,
 * so a run of mixed tabs/spaces can be measured by length and sliced by column.
 */
export function expandIndentToColumns(indent: string): string {
  return indent
    .split('')
    .reduce((columns, char) => columns + (char === '\t' ? ' '.repeat(4 - (columns.length % 4)) : ' '), '');
}

/** Indentation width of a line in CommonMark columns (a tab advances to the next 4-column stop). */
export const indentWidth = (line: string): number => expandIndentToColumns(leadingIndent(line)).length;
