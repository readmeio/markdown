import { htmlRawNames } from 'micromark-util-html-tag-name';

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

const RAW_TEXT_TAG_MATCHERS = htmlRawNames.map(tag => ({
  open: new RegExp(`<${tag}(?=[\\s/>])[^>]*?(?<!/)>`, 'gi'),
  close: new RegExp(`</${tag}(?=[\\s>])[^>]*>`, 'gi'),
}));

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
  // Per-tag count of still-open raw-text elements at the current line boundary.
  const rawTextDepths = RAW_TEXT_TAG_MATCHERS.map(() => 0);

  for (let i = 0; i < lines.length; i += 1) {
    const insideRawText = rawTextDepths.some(d => d > 0);

    RAW_TEXT_TAG_MATCHERS.forEach(({ open, close }, tagIndex) => {
      const opens = (lines[i].match(open) ?? []).length;
      const closes = (lines[i].match(close) ?? []).length;
      // Reset lastIndex — module-scoped `/g` regexes.
      open.lastIndex = 0;
      close.lastIndex = 0;
      rawTextDepths[tagIndex] = Math.max(0, rawTextDepths[tagIndex] + opens - closes);
    });

    // A `<table>` inside a raw-text body is payload text: never rewrite it, and
    // never let it skew the table depth used to judge later openers.
    if (insideRawText) continue;

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
