import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

// Claims a line-final `{#id}` as one token, so emphasis can't pair across it and an escaped `\{`
// never starts one. Whether it becomes a heading id is decided later, once headings are built.

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    headingId: 'headingId';
  }
}

/** One character a `{#id}` heading id may use: the ones github-slugger keeps, plus `.` and `:`. */
export const HEADING_ID_CHAR = '[\\p{L}\\p{M}\\p{N}_.:-]';

const ID_CHAR_REGEX = new RegExp(`^${HEADING_ID_CHAR}$`, 'u');

const isIdChar = (code: Code): boolean => code !== null && code >= 0 && ID_CHAR_REGEX.test(String.fromCharCode(code));

// Looks past the `}` for the end of the line without keeping what it reads, so trailing spaces stay
// with the text after the id and can still form a hard break.
const lineEndConstruct: Construct = {
  partial: true,
  tokenize(effects: Effects, ok: State, nok: State): State {
    const after = (code: Code): State | undefined =>
      code === codes.eof || markdownLineEnding(code) ? ok(code) : nok(code);

    const spaces = (code: Code): State | undefined => {
      if (markdownSpace(code)) {
        effects.consume(code);
        return spaces;
      }
      effects.exit(types.whitespace);
      return after(code);
    };

    return (code: Code): State | undefined => {
      if (!markdownSpace(code)) return after(code);
      effects.enter(types.whitespace);
      return spaces(code);
    };
  },
};

function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let hasId = false;

  const id = (code: Code): State | undefined => {
    if (code === codes.rightCurlyBrace && hasId) {
      effects.consume(code);
      effects.exit('headingId');
      return effects.check(lineEndConstruct, ok, nok);
    }
    if (!isIdChar(code)) return nok(code);
    hasId = true;
    effects.consume(code);
    return id;
  };

  const hash = (code: Code): State | undefined => {
    if (code !== codes.numberSign) return nok(code);
    effects.consume(code);
    return id;
  };

  return (code: Code): State | undefined => {
    if (code !== codes.leftCurlyBrace) return nok(code);
    effects.enter('headingId');
    effects.consume(code);
    return hash;
  };
}

const headingIdConstruct: Construct = { name: 'headingId', tokenize };

export function headingId(): Extension {
  return { text: { [codes.leftCurlyBrace]: headingIdConstruct } };
}
