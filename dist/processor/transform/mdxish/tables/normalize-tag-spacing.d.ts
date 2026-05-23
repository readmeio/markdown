import { type RepairResult } from './utils';
/**
 * mdxjs's micromark extension fails when a JSX element's opener-line and
 * closer-line don't match in "is the tag alone on its line?" Concretely:
 *
 *   <span>X\n</span>           ❌  opener-line has text, closer-line is bare
 *   <span>\nX</span>           ❌  opener-line is bare, closer-line has text
 *   text <span>X\n</span>      ❌  opener-line has leading + trailing text
 *   <span>\nX\n</span> text    ❌  closer-line has trailing text
 *   <span>X\nY</span>          ✅  both lines have adjacent text
 *   <span>\nX\n</span>         ✅  both lines are bare
 *   <span>X</span>             ✅  same line
 *
 * When the two lines disagree, mdxjs throws "Expected a closing tag…before
 * the end of `paragraph`" (or its mirror). This pass detects asymmetric
 * pairs and inserts newlines (+ matching indent) to push the offending side's
 * non-tag content to a separate line, restoring symmetry. Scoped to the
 * malformed-retry path; the happy path doesn't touch this.
 */
export declare const normalizeTagSpacing: (html: string) => RepairResult;
