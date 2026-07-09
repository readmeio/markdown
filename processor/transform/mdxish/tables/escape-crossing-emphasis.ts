import { maskNonTagRegions, walkTags } from './tag-walker';
import { applyInserts, type Insert, type RepairResult } from './utils';

// Maximal run of a single emphasis delimiter (`_`, `*`, `**`, `***`, …).
const EMPHASIS_RUN_RE = /([*_])\1*/g;

const isWhitespace = (ch: string | undefined): boolean => ch === undefined || /\s/.test(ch);

// ASCII punctuation, per the CommonMark flanking definition. String bounds
// (undefined) count as whitespace, not punctuation.
const isPunctuation = (ch: string | undefined): boolean => {
  if (ch === undefined) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= 33 && code <= 47) ||
    (code >= 58 && code <= 64) ||
    (code >= 91 && code <= 96) ||
    (code >= 123 && code <= 126)
  );
};

interface Flanking {
  canClose: boolean;
  canOpen: boolean;
}

/**
 * Decide whether a delimiter run can open and/or close emphasis, following
 * CommonMark's left/right-flanking rules. `_` additionally can't open/close
 * intraword, which is what keeps `snake_case` from being treated as emphasis.
 */
const analyzeFlanking = (source: string, char: string, start: number, end: number): Flanking => {
  const before = start > 0 ? source[start - 1] : undefined;
  const after = end < source.length ? source[end] : undefined;

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

interface TagOpenEvent {
  kind: 'tagOpen';
  offset: number;
}
interface TagCloseEvent {
  kind: 'tagClose';
  offset: number;
}
interface EmphasisEvent {
  char: string;
  flanking: Flanking;
  kind: 'emphasis';
  length: number;
  offset: number;
}
type WalkEvent = EmphasisEvent | TagCloseEvent | TagOpenEvent;

// At a shared offset, an opener must sort before an emphasis run before a closer
// so a self-closing tag's open/close bracket the run rather than swallow it.
const eventPriority = (event: WalkEvent): number =>
  event.kind === 'tagOpen' ? 0 : event.kind === 'emphasis' ? 1 : 2;

const collectTagEvents = (source: string): (TagCloseEvent | TagOpenEvent)[] => {
  const events: (TagCloseEvent | TagOpenEvent)[] = [];
  walkTags(source, {
    onOpen: ({ start }) => events.push({ kind: 'tagOpen', offset: start }),
    onClose: ({ start }) => events.push({ kind: 'tagClose', offset: start }),
  });
  return events;
};

const collectEmphasisEvents = (masked: string, source: string): EmphasisEvent[] => {
  const events: EmphasisEvent[] = [];
  EMPHASIS_RUN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMPHASIS_RUN_RE.exec(masked)) !== null) {
    const start = match.index;
    // Leave already-escaped delimiters alone.
    // eslint-disable-next-line no-continue
    if (source[start - 1] === '\\') continue;
    const char = match[1];
    const length = match[0].length;
    events.push({ kind: 'emphasis', offset: start, char, length, flanking: analyzeFlanking(source, char, start, start + length) });
  }
  return events;
};

type Frame = { char: string; kind: 'em'; length: number; offset: number } | { kind: 'tag' };

/**
 * mdxjs rejects a table when a markdown emphasis run opens at one HTML
 * tag-nesting depth and closes at another — e.g. `_<ul><li>text_</li></ul>`,
 * where the `_` opens outside the list but closes inside a `<li>`. It throws
 * "Expected a closing tag for `<li>` before the end of `emphasis`" and the
 * whole `<Table>` fails to parse.
 *
 * This pass walks tags and emphasis delimiters together, keeping a stack of
 * open tags and open emphasis. A delimiter only matches an opener living in the
 * same tag context; any emphasis left dangling when its enclosing tag closes
 * (or at end of input), and any closer with no in-context opener, is escaped so
 * mdxjs treats it as literal text. Scoped to the malformed-retry path.
 */
export const escapeCrossingEmphasis = (html: string): RepairResult => {
  const masked = maskNonTagRegions(html);
  const events: WalkEvent[] = [...collectTagEvents(html), ...collectEmphasisEvents(masked, html)].sort(
    (a, b) => a.offset - b.offset || eventPriority(a) - eventPriority(b),
  );

  const stack: Frame[] = [];
  const orphans: { length: number; offset: number }[] = [];

  events.forEach(event => {
    if (event.kind === 'tagOpen') {
      stack.push({ kind: 'tag' });
      return;
    }
    if (event.kind === 'tagClose') {
      // Unwind to the nearest open tag; emphasis opened inside it never closed
      // within the tag, so it crosses the boundary.
      while (stack.length > 0) {
        const frame = stack.pop();
        if (!frame || frame.kind === 'tag') break;
        orphans.push({ offset: frame.offset, length: frame.length });
      }
      return;
    }

    const top = stack[stack.length - 1];
    if (event.flanking.canClose && top?.kind === 'em' && top.char === event.char) {
      stack.pop();
    } else if (event.flanking.canOpen) {
      stack.push({ kind: 'em', char: event.char, offset: event.offset, length: event.length });
    } else if (event.flanking.canClose) {
      orphans.push({ offset: event.offset, length: event.length });
    }
  });

  stack.forEach(frame => {
    if (frame.kind === 'em') orphans.push({ offset: frame.offset, length: frame.length });
  });

  const inserts: Insert[] = orphans.flatMap(({ offset, length }) =>
    Array.from({ length }, (_unused, i) => ({ offset: offset + i, text: '\\' })),
  );
  return applyInserts(html, inserts);
};
