/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    legacyVariable: 'legacyVariable';
    legacyVariableMarkerEnd: 'legacyVariableMarkerEnd';
    legacyVariableMarkerStart: 'legacyVariableMarkerStart';
    legacyVariableValue: 'legacyVariableValue';
  }
}

function isAllowedValueChar(code: Code): boolean {
  return (
    code !== null &&
    code !== codes.lessThan &&
    code !== codes.greaterThan &&
    !markdownLineEnding(code)
  );
}

const legacyVariableConstruct: Construct = {
  name: 'legacyVariable',
  tokenize,
};

function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let hasValue = false;

  const start = (code: Code): State | undefined => {
    if (code !== codes.lessThan) return nok(code);

    effects.enter('legacyVariable');
    effects.enter('legacyVariableMarkerStart');
    effects.consume(code); // <
    return open2;
  };

  const open2 = (code: Code): State | undefined => {
    if (code !== codes.lessThan) return nok(code);
    effects.consume(code); // <<
    effects.exit('legacyVariableMarkerStart');
    effects.enter('legacyVariableValue');
    return value;
  };

  const value = (code: Code): State | undefined => {
    if (code === codes.greaterThan) {
      if (!hasValue) return nok(code);
      effects.exit('legacyVariableValue');
      effects.enter('legacyVariableMarkerEnd');
      effects.consume(code); // >
      return close2;
    }

    if (!isAllowedValueChar(code)) return nok(code);

    hasValue = true;
    effects.consume(code);
    return value;
  };

  const close2 = (code: Code): State | undefined => {
    if (code !== codes.greaterThan) return nok(code);
    effects.consume(code); // >>
    effects.exit('legacyVariableMarkerEnd');
    effects.exit('legacyVariable');
    return ok;
  };

  return start;
}

export function legacyVariable(): Extension {
  return {
    text: { [codes.lessThan]: legacyVariableConstruct },
  };
}
