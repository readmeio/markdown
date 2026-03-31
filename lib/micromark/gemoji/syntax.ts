/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { codes } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    gemoji: 'gemoji';
    gemojiMarker: 'gemojiMarker';
    gemojiName: 'gemojiName';
  }
}

// Matches the name pattern from the original regex: \+1 or [-\w]+
// see https://github.com/readmeio/markdown/blob/489a71e19b34f640595ce81e988dad631045186f/processor/transform/gemoji%2B.ts#L9
function isNameChar(code: Code): boolean {
  if (code === null) return false;

  return (
    (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
    (code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
    (code >= codes.digit0 && code <= codes.digit9) ||
    code === codes.dash ||
    code === codes.underscore
  );
}

const gemojiConstruct: Construct = {
  name: 'gemoji',
  tokenize,
};

function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let hasName = false;

  // Entry point — expect opening `:`
  const start = (code: Code): State | undefined => {
    if (code !== codes.colon) return nok(code);

    effects.enter('gemoji');
    effects.enter('gemojiMarker');
    effects.consume(code); // :
    effects.exit('gemojiMarker');
    effects.enter('gemojiName');
    return nameStart;
  };

  // First char after `:`, branch on `+` for :+1:, otherwise start normal name
  const nameStart = (code: Code): State | undefined => {
    if (code === codes.plusSign) {
      effects.consume(code); // +
      return plusOne;
    }

    if (isNameChar(code)) {
      hasName = true;
      effects.consume(code);
      return name;
    }

    // Not a valid shortcode start (e.g. `::`, `: `, `:<`)
    return nok(code);
  };

  // After `+`, only `1` is valid (for :+1:), anything else rejects
  // this is a special case for :+1: 👍 since + isnt a normal name character
  const plusOne = (code: Code): State | undefined => {
    if (code === codes.digit1) {
      hasName = true;
      effects.consume(code); // 1
      return nameEnd;
    }

    return nok(code);
  };

  // Consume name characters until we hit closing `:` or an invalid char
  const name = (code: Code): State | undefined => {
    if (code === codes.colon) {
      if (!hasName) return nok(code);
      return nameEnd(code);
    }

    if (isNameChar(code)) {
      effects.consume(code);
      return name;
    }

    // Invalid character in name (space, newline, special char) — reject
    return nok(code);
  };

  // Expect closing `:`
  const nameEnd = (code: Code): State | undefined => {
    if (code !== codes.colon) return nok(code);

    effects.exit('gemojiName');
    effects.enter('gemojiMarker');
    effects.consume(code); // :
    effects.exit('gemojiMarker');
    effects.exit('gemoji');
    return ok;
  };

  return start;
}

export function gemoji(): Extension {
  return {
    text: { [codes.colon]: gemojiConstruct },
  };
}
