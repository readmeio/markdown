import { htmlRawNames } from 'micromark-util-html-tag-name';

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

/** A line that is only a bare `<table>` / `<Table>` opener (the common missing-slash typo). */
const BARE_TABLE_OPENER_RE = /^(\s*)<(table|Table)>\s*$/;

/** A bare `<table>` followed by one of these starts a real nested table and is left alone. */
const NESTED_TABLE_BODY_START_RE =
  /^<(?:thead|tbody|tfoot|tr|th|td|caption|colgroup|col|table|Table)(?=[\s/>])/i;

/** Empty nested `<table>\n</table>` — the opener is intentional. */
const TABLE_CLOSER_RE = /^<\/table(?=[\s>])/i;

const TABLE_OPEN_RE = /<(?:table|Table)(?=[\s/>])[^>]*?(?<!\/)>/g;
const TABLE_CLOSE_RE = /<\/(?:table|Table)(?=[\s>])[^>]*>/g;

const RAW_TEXT_OPENER_RE = new RegExp(`<(${htmlRawNames.join('|')})(?=[\\s/>])[^>]*?(?<!/)>`, 'i');

const RAW_TEXT_CLOSERS = Object.fromEntries(
  htmlRawNames.map(tag => [tag, new RegExp(`</${tag}(?=[\\s>])[^>]*>`, 'i')]),
);

interface StripRawTextResult {
  openRawTag: string | null;
  visible: string;
}

/**
 * Returns the parts of a line outside raw-text (<pre>/<script>/<style>/<textarea>) payload —
 * a `<table>` inside those bodies must not count toward table depth. Raw text cannot nest.
 */
function stripRawTextPayload(line: string, openRawTag: string | null): StripRawTextResult {
  let visible = '';
  let rest = line;
  let tag = openRawTag;

  while (rest.length > 0) {
    if (tag !== null) {
      const closer = RAW_TEXT_CLOSERS[tag].exec(rest);
      if (!closer) return { visible, openRawTag: tag };
      rest = rest.slice(closer.index + closer[0].length);
      tag = null;
    } else {
      const opener = RAW_TEXT_OPENER_RE.exec(rest);
      if (!opener) break;
      visible += rest.slice(0, opener.index);
      rest = rest.slice(opener.index + opener[0].length);
      tag = opener[1].toLowerCase();
    }
  }

  return { visible: visible + (tag === null ? rest : ''), openRawTag: tag };
}

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
  let openRawTag: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const stripped = stripRawTextPayload(lines[i], openRawTag);
    // Only a line with no raw-text involvement can be a mistyped closer.
    const isFullyVisible = openRawTag === null && stripped.visible === lines[i];
    openRawTag = stripped.openRawTag;

    const match = isFullyVisible ? BARE_TABLE_OPENER_RE.exec(lines[i]) : null;
    if (match && depth > 0) {
      const next = nextNonEmptyLine(lines, i + 1);
      const isRealNestedOpener =
        next !== undefined && (NESTED_TABLE_BODY_START_RE.test(next) || TABLE_CLOSER_RE.test(next));
      if (!isRealNestedOpener) {
        const [, indent, name] = match;
        lines[i] = `${indent}</${name}>`;
      }
    }

    // A repaired closer must decrement, so count post-rewrite `lines[i]` when visible.
    depth = Math.max(0, depth + countTableDelta(isFullyVisible ? lines[i] : stripped.visible));
  }

  return restoreCodeBlocks(lines.join('\n'), protectedCode);
}
