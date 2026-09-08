import { unicodePunctuation, unicodeWhitespace } from 'micromark-util-character';

import { maskNonTagRegions, walkTags } from './tag-walker';
import { applyInserts, type Insert, type RepairResult } from './utils';

// Maximal run of a single emphasis delimiter (`_`, `*`, `**`, `***`, …).
const EMPHASIS_RUN_RE = /([*_])\1*/g;

// String bounds (undefined) count as whitespace, not punctuation, per the
// CommonMark flanking definition.
const isWhitespace = (ch: string | undefined): boolean => ch === undefined || unicodeWhitespace(ch.charCodeAt(0));

const isPunctuation = (ch: string | undefined): boolean => ch !== undefined && unicodePunctuation(ch.charCodeAt(0));

interface Flanking {
  canClose: boolean;
  canOpen: boolean;
}

/**
 * Whether a delimiter run can open and/or close emphasis, per CommonMark's
 * left/right-flanking rules. The extra `_` conditions forbid intraword
 * emphasis, which keeps `snake_case` from being treated as a delimiter.
 */
const analyzeFlanking = (source: string, char: string, start: number, end: number): Flanking => {
  const before = source[start - 1];
  const after = source[end];
  const leftFlanking =
    !isWhitespace(after) && (!isPunctuation(after) || isWhitespace(before) || isPunctuation(before));
  const rightFlanking =
    !isWhitespace(before) && (!isPunctuation(before) || isWhitespace(after) || isPunctuation(after));

  if (char === '_') {
    return {
      canOpen: leftFlanking && (!rightFlanking || isPunctuation(before)),
      canClose: rightFlanking && (!leftFlanking || isPunctuation(after)),
    };
  }
  return { canOpen: leftFlanking, canClose: rightFlanking };
};

type WalkEvent =
  | { char: string; flanking: Flanking; kind: 'emphasis'; length: number; offset: number }
  | { kind: 'tagClose'; offset: number }
  | { kind: 'tagOpen'; offset: number };

/**
 * Collect HTML tag boundaries (via htmlparser2) and emphasis delimiter runs
 * (via regex over the masked source, so code spans and escaped `<` are skipped)
 * into one list ordered by position. At a shared offset a tag opener sorts
 * before a closer, so a self-closing tag brackets rather than swallows a run.
 */
const collectEvents = (html: string): WalkEvent[] => {
  const masked = maskNonTagRegions(html);
  const events: WalkEvent[] = [];

  walkTags(html, {
    onOpen: ({ start }) => events.push({ kind: 'tagOpen', offset: start }),
    onClose: ({ start }) => events.push({ kind: 'tagClose', offset: start }),
  });

  EMPHASIS_RUN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMPHASIS_RUN_RE.exec(masked)) !== null) {
    const [run, char] = match;
    const start = match.index;
    // eslint-disable-next-line no-continue
    if (html[start - 1] === '\\') continue; // already escaped
    events.push({ kind: 'emphasis', offset: start, char, length: run.length, flanking: analyzeFlanking(html, char, start, start + run.length) });
  }

  return events.sort((a, b) => a.offset - b.offset || (a.kind === 'tagClose' ? 1 : 0) - (b.kind === 'tagClose' ? 1 : 0));
};

interface OpenEmphasis {
  char: string;
  depth: number;
  length: number;
  offset: number;
}

/**
 * mdxjs rejects a table when a markdown emphasis run opens at one HTML
 * tag-nesting depth and closes at another — e.g. `_<ul><li>text_</li></ul>`,
 * where the `_` opens outside the list but closes inside a `<li>`. It throws
 * "Expected a closing tag for `<li>` before the end of `emphasis`" and the
 * whole `<Table>` fails to parse.
 *
 * We walk tags and emphasis together, tracking tag depth and a stack of open
 * emphasis. A delimiter only closes an opener at the same depth; any emphasis
 * still open when its enclosing tag closes (or at end of input), and any closer
 * with no same-depth opener, is escaped so mdxjs treats it as literal text.
 * Scoped to the malformed-retry path.
 */
export const escapeCrossingEmphasis = (html: string): RepairResult => {
  const open: OpenEmphasis[] = [];
  const orphans: { length: number; offset: number }[] = [];
  let depth = 0;

  collectEvents(html).forEach(event => {
    if (event.kind === 'tagOpen') {
      depth += 1;
      return;
    }
    if (event.kind === 'tagClose') {
      depth -= 1;
      // Emphasis opened deeper than the surviving depth was inside the tag that
      // just closed, so it crosses the boundary.
      while (open.length > 0 && open[open.length - 1].depth > depth) {
        const crossed = open.pop();
        if (crossed) orphans.push(crossed);
      }
      return;
    }

    const top = open[open.length - 1];
    if (event.flanking.canClose && top?.char === event.char && top.depth === depth) {
      open.pop();
    } else if (event.flanking.canOpen) {
      open.push({ char: event.char, depth, offset: event.offset, length: event.length });
    } else if (event.flanking.canClose) {
      orphans.push({ offset: event.offset, length: event.length });
    }
  });

  orphans.push(...open); // anything still open never closed

  const inserts: Insert[] = orphans.flatMap(({ offset, length }) =>
    Array.from({ length }, (_unused, i) => ({ offset: offset + i, text: '\\' })),
  );
  return applyInserts(html, inserts);
};
