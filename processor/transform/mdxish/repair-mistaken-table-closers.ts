import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

/** A line that is only a bare `<table>` / `<Table>` opener (the common missing-slash typo). */
const BARE_TABLE_OPENER_RE = /^(\s*)<(table|Table)>\s*$/;

/**
 * Openers that begin a real nested table body. A bare `<table>` followed by one
 * of these is left alone; followed by anything else (markdown, `</td>`, EOF) it
 * is treated as a mistaken `</table>`.
 */
const NESTED_TABLE_BODY_START_RE =
  /^<(?:thead|tbody|tfoot|tr|th|td|caption|colgroup|col|table|Table)(?=[\s/>])/i;

/** Empty nested `<table>\n</table>` — the opener is intentional. */
const TABLE_CLOSER_RE = /^<\/table(?=[\s>])/i;

const TABLE_OPEN_RE = /<(?:table|Table)(?=[\s/>])[^>]*?(?<!\/)>/g;
const TABLE_CLOSE_RE = /<\/(?:table|Table)(?=[\s>])[^>]*>/g;

const countTableDelta = (line: string): number => {
  const opens = (line.match(TABLE_OPEN_RE) ?? []).length;
  const closes = (line.match(TABLE_CLOSE_RE) ?? []).length;
  // Reset lastIndex — these are module-scoped `/g` regexes.
  TABLE_OPEN_RE.lastIndex = 0;
  TABLE_CLOSE_RE.lastIndex = 0;
  return opens - closes;
};

const nextNonEmptyLine = (lines: string[], from: number): string | undefined => {
  for (let i = from; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
};

/**
 * Rewrites a bare `<table>` that is almost certainly a missing-slash closer
 * (`</table>` typo) so `jsxTable` / `terminateHtmlFlowBlocks` see a real close.
 *
 * Customer docs (CX-3850 / Akamai) close tables with a second `<table>` opener;
 * without this, the HTML flow block swallows following markdown (Notes callouts).
 * Real nested tables are preserved: a bare opener followed by row/section tags
 * (or an immediate `</table>`) is left unchanged.
 *
 * @example
 * repairMistakenTableClosers('<table>\\n<tr><td>x</td></tr>\\n<table>\\n> note')
 * // '<table>\\n<tr><td>x</td></tr>\\n</table>\\n> note'
 */
export function repairMistakenTableClosers(content: string) {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);
  const lines = protectedContent.split('\n');
  let depth = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const match = BARE_TABLE_OPENER_RE.exec(lines[i]);
    if (match && depth > 0) {
      const next = nextNonEmptyLine(lines, i + 1);
      const isRealNestedOpener =
        next !== undefined && (NESTED_TABLE_BODY_START_RE.test(next) || TABLE_CLOSER_RE.test(next));
      if (!isRealNestedOpener) {
        const [, indent, name] = match;
        lines[i] = `${indent}</${name}>`;
      }
    }

    depth = Math.max(0, depth + countTableDelta(lines[i]));
  }

  return restoreCodeBlocks(lines.join('\n'), protectedCode);
}
