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

  const start = (code: Code): State | undefined => {
    if (code !== codes.colon) return nok(code);

    effects.enter('gemoji');
    effects.enter('gemojiMarker');
    effects.consume(code); // :
    effects.exit('gemojiMarker');
    effects.enter('gemojiName');
    return nameStart;
  };

  // First character of the name — handle +1 special case
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

    return nok(code);
  };

  // After +, expect 1
  const plusOne = (code: Code): State | undefined => {
    if (code === codes.digit1) {
      hasName = true;
      effects.consume(code); // 1
      return nameEnd;
    }

    return nok(code);
  };

  const name = (code: Code): State | undefined => {
    if (code === codes.colon) {
      if (!hasName) return nok(code);
      return nameEnd(code);
    }

    if (isNameChar(code)) {
      effects.consume(code);
      return name;
    }

    return nok(code);
  };

  // Expect closing colon
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
