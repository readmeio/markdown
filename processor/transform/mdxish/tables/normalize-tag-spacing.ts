import { Parser } from 'htmlparser2';

/**
 * Replace fenced code blocks, inline code spans, and backslash-escaped tag
 * openers with same-length whitespace so htmlparser2 doesn't pick up `<`
 * inside code or after a markdown escape as tags. We feed the masked string
 * to the parser purely for tag detection; the rewrites splice against the
 * original `html`, so offsets line up either way.
 */
const maskCodeRegions = (html: string): string =>
  html
    .replace(/```[\s\S]*?```|``(?:[^`]|`(?!`))*``|`[^`\n]*`/g, m => ' '.repeat(m.length))
    // `<<NAME>>` is ReadMe's legacy variable syntax — the inner `<NAME>` is
    // not a tag. Mask any `<<` (also handles malformed variants like
    // `<<string>` with a single `>`).
    .replace(/<</g, '  ')
    // `\<tag>` is a markdown escape — the `<` is literal text, not a tag.
    .replace(/\\</g, '  ');

interface OpenTag {
  name: string;
  openEnd: number;
  openStart: number;
}

interface PairedTag {
  closeEnd: number;
  closeStart: number;
  name: string;
  openEnd: number;
  openStart: number;
}

interface Insert {
  offset: number;
  text: string;
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
export const normalizeTagSpacing = (html: string): string => {
  const masked = maskCodeRegions(html);
  const stack: OpenTag[] = [];
  const pairs: PairedTag[] = [];

  const parser: Parser = new Parser(
    {
      onopentag(name) {
        // htmlparser2's endIndex on an open-tag event points at `>`; +1 lands
        // just past it (where we'd splice a newline).
        stack.push({ name, openStart: parser.startIndex, openEnd: (parser.endIndex ?? parser.startIndex) + 1 });
      },
      onclosetag(name, implicit) {
        if (implicit) return;
        // Walk the stack to find the innermost matching opener. `findLastIndex`
        // would be cleaner but isn't available on the current lib target.
        const matchIdx = stack.reduce((acc, t, i) => (t.name === name ? i : acc), -1);
        if (matchIdx === -1) return;
        const open = stack[matchIdx];
        pairs.push({
          name,
          openStart: open.openStart,
          openEnd: open.openEnd,
          closeStart: parser.startIndex,
          closeEnd: (parser.endIndex ?? parser.startIndex) + 1,
        });
        stack.splice(matchIdx, 1);
      },
    },
    {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false,
      recognizeSelfClosing: true,
    },
  );
  parser.write(masked);
  parser.end();

  if (pairs.length === 0) return html;

  const inserts: Insert[] = pairs.flatMap(({ openEnd, openStart, closeStart, closeEnd }): Insert[] => {
    // Same-line pair — mdxjs parses this fine, nothing to do.
    if (!html.slice(openEnd, closeStart).includes('\n')) return [];

    const openLine = lineBoundsAt(html, openStart);
    const closeLine = lineBoundsAt(html, closeStart);

    const preOpener = html.slice(openLine.start, openStart);
    const postOpener = html.slice(openEnd, openLine.end);
    const preCloser = html.slice(closeLine.start, closeStart);
    const postCloser = html.slice(closeEnd, closeLine.end);

    const openerHasExtras = preOpener.trim().length > 0 || postOpener.trim().length > 0;
    const closerHasExtras = preCloser.trim().length > 0 || postCloser.trim().length > 0;

    // Both sides match (both bare or both attached) — parses fine.
    if (openerHasExtras === closerHasExtras) return [];

    // Asymmetric. Push the side that has non-tag content to flow level by
    // inserting newlines on whichever ends carry text. Indent the inserted
    // line so it visually aligns with the existing whitespace prefix on the
    // tag's own line.
    const indentFor = (linePrefix: string) => linePrefix.match(/^\s*/)?.[0] ?? '';
    const out: Insert[] = [];
    if (openerHasExtras) {
      const indent = indentFor(preOpener);
      if (preOpener.trim().length > 0) out.push({ offset: openStart, text: `\n${indent}` });
      if (postOpener.trim().length > 0) out.push({ offset: openEnd, text: `\n${indent}` });
    }
    if (closerHasExtras) {
      const indent = indentFor(preCloser);
      if (preCloser.trim().length > 0) out.push({ offset: closeStart, text: `\n${indent}` });
      if (postCloser.trim().length > 0) out.push({ offset: closeEnd, text: `\n${indent}` });
    }
    return out;
  });

  if (inserts.length === 0) return html;

  inserts.sort((a, b) => a.offset - b.offset);
  const { out, cursor } = inserts.reduce(
    (acc, { offset, text }) => ({
      out: acc.out + html.slice(acc.cursor, offset) + text,
      cursor: offset,
    }),
    { out: '', cursor: 0 },
  );
  return out + html.slice(cursor);
};
