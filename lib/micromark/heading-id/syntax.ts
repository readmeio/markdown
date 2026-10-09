import type { Construct, Event, Extension, Resolver, Token, TokenizeContext } from 'micromark-util-types';

import { headingAtx } from 'micromark-core-commonmark';
import { codes } from 'micromark-util-symbol';

// An ATX heading's words arrive as separate `atxHeadingText` tokens, split on `#`, so a trailing
// `{#id}` is three of them: `{`, a one-`#` sequence and `id}`. Taking them off the heading before
// its text is handed to the inline parsers keeps every other construct, and every paragraph,
// exactly as it was.

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    headingId: 'headingId';
  }
}

/** One character a `{#id}` heading id may use: the ones github-slugger keeps, plus `.` and `:`. */
export const HEADING_ID_CHAR = '[\\p{L}\\p{M}\\p{N}_.:-]';

const ID_CLOSE_REGEX = new RegExp(`^${HEADING_ID_CHAR}+\\}$`, 'u');

const typeAt = (events: Event[], index: number) => events[index]?.[1].type;

function isIdToken(events: Event[], index: number, context: TokenizeContext, type: Token['type'], value: RegExp) {
  return typeAt(events, index) === type && value.test(context.sliceSerialize(events[index][1]));
}

/** The exit index of the heading's last content token, past any trailing space and closing `##`. */
function contentEnd(events: Event[]): number {
  let end = events.length - 2;
  if (typeAt(events, end) === 'whitespace') end -= 2;
  if (typeAt(events, end) === 'atxHeadingSequence' && typeAt(events, end - 2) === 'whitespace') end -= 4;
  return end;
}

const resolveHeadingId: Resolver = (events, context) => {
  const close = contentEnd(events);
  const hash = close - 2;
  const open = close - 4;
  const space = close - 6;
  const endsWithId =
    isIdToken(events, close, context, 'atxHeadingText', ID_CLOSE_REGEX) &&
    isIdToken(events, hash, context, 'atxHeadingSequence', /^#$/) &&
    isIdToken(events, open, context, 'atxHeadingText', /^\{$/) &&
    typeAt(events, space) === 'whitespace';
  if (!endsWithId) return headingAtx.resolve?.(events, context) ?? events;

  const id: Token = { type: 'headingId', start: events[open][1].start, end: events[close][1].end };
  events.splice(space - 1, 8);
  const resolved = headingAtx.resolve?.(events, context) ?? events;
  resolved.splice(resolved.length - 1, 0, ['enter', id, context], ['exit', id, context]);
  return resolved;
};

const headingIdConstruct: Construct = { ...headingAtx, resolve: resolveHeadingId };

/** The ATX heading construct, with a line-final ` {#id}` split off as a `headingId` token. */
export function headingId(): Extension {
  return { flow: { [codes.numberSign]: headingIdConstruct } };
}
