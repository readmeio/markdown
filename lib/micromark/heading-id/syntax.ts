import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

// Claims a line-final `{#id}` as one token, so emphasis can't pair across it and an escaped `\{`
// never starts one. Whether it becomes a heading id is decided later, once headings are built.

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    headingId: 'headingId';
  }
}

const isIdChar = (code: Code): boolean =>
  code !== null &&
  code !== codes.leftCurlyBrace &&
  code !== codes.rightCurlyBrace &&
  code !== codes.numberSign &&
  !markdownLineEnding(code) &&
  !markdownSpace(code);

function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let hasId = false;

  const trailing = (code: Code): State | undefined => {
    if (markdownSpace(code)) {
      effects.consume(code);
      return trailing;
    }
    if (code !== null && !markdownLineEnding(code)) return nok(code);
    effects.exit('headingId');
    return ok(code);
  };

  const id = (code: Code): State | undefined => {
    if (code === codes.rightCurlyBrace && hasId) {
      effects.consume(code);
      return trailing;
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
