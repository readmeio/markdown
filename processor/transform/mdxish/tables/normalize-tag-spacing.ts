import { walkTags } from './tag-walker';
import { applyInserts, type Insert, type RepairResult } from './utils';

interface OpenFrame {
  name: string;
  openEnd: number;
  openStart: number;
}

interface PairedTag {
  closeEnd: number;
  closeStart: number;
  openEnd: number;
  openStart: number;
}

/**
 * Returns the line bounds (start and end-exclusive offsets) containing `at`.
 */
const lineBoundsAt = (html: string, at: number): { end: number; start: number } => {
  const start = html.lastIndexOf('\n', at - 1) + 1;
  const nl = html.indexOf('\n', at);
  return { start, end: nl === -1 ? html.length : nl };
};

/**
 * Compute the inserts needed to make one open/close pair line-symmetric.
 * Returns an empty array if the pair is already symmetric (both bare or both
 * attached) or shares a line.
 */
const symmetrizePair = (html: string, { openStart, openEnd, closeStart, closeEnd }: PairedTag): Insert[] => {
  if (!html.slice(openEnd, closeStart).includes('\n')) return [];

  const openLine = lineBoundsAt(html, openStart);
  const closeLine = lineBoundsAt(html, closeStart);
  const preOpener = html.slice(openLine.start, openStart);
  const postOpener = html.slice(openEnd, openLine.end);
  const preCloser = html.slice(closeLine.start, closeStart);
  const postCloser = html.slice(closeEnd, closeLine.end);

  const openerHasExtras = preOpener.trim().length > 0 || postOpener.trim().length > 0;
  const closerHasExtras = preCloser.trim().length > 0 || postCloser.trim().length > 0;

  // A blank line between the opener and closer puts them in separate
  // paragraph blocks. mdxjs tolerates that only when both tags are bare on
  // their lines (a flow element); if the content is attached to the tags it
  // throws because the closer never appears in the opener's paragraph.
  const spansBlankLine = /\n[^\S\n]*\n/.test(html.slice(openEnd, closeStart));

  // Both match (both bare or both attached) — mdxjs parses this fine, unless a
  // blank line splits an attached pair across paragraphs. In that case push
  // both sides' content to their own lines so the tags sit bare at flow level.
  if (openerHasExtras === closerHasExtras && !(openerHasExtras && spansBlankLine)) return [];

  // Asymmetric (or attached-but-split). Push non-tag content on each offending
  // side to its own line, aligning the inserted line with the existing prefix.
  const indentFor = (linePrefix: string) => linePrefix.match(/^\s*/)?.[0] ?? '';
  const inserts: Insert[] = [];
  if (openerHasExtras) {
    const indent = indentFor(preOpener);
    if (preOpener.trim().length > 0) inserts.push({ offset: openStart, text: `\n${indent}` });
    if (postOpener.trim().length > 0) inserts.push({ offset: openEnd, text: `\n${indent}` });
  }
  if (closerHasExtras) {
    const indent = indentFor(preCloser);
    if (preCloser.trim().length > 0) inserts.push({ offset: closeStart, text: `\n${indent}` });
    if (postCloser.trim().length > 0) inserts.push({ offset: closeEnd, text: `\n${indent}` });
  }
  return inserts;
};

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
export const normalizeTagSpacing = (html: string): RepairResult => {
  const stack: OpenFrame[] = [];
  const pairs: PairedTag[] = [];

  walkTags(html, {
    onOpen({ name, start, end }) {
      stack.push({ name, openStart: start, openEnd: end });
    },
    onClose({ name, start, end, implicit }) {
      if (implicit) return;
      // Walk the stack to find the innermost matching opener. `findLastIndex`
      // would be cleaner but isn't available on the current lib target.
      const matchIdx = stack.reduce((acc, t, i) => (t.name === name ? i : acc), -1);
      if (matchIdx === -1) return;
      const open = stack[matchIdx];
      pairs.push({ openStart: open.openStart, openEnd: open.openEnd, closeStart: start, closeEnd: end });
      stack.splice(matchIdx, 1);
    },
  });

  return applyInserts(html, pairs.flatMap(p => symmetrizePair(html, p)));
};
