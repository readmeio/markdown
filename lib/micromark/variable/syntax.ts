/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    readmeVariable: 'readmeVariable';
    readmeVariableMarkerEnd: 'readmeVariableMarkerEnd';
    readmeVariableMarkerStart: 'readmeVariableMarkerStart';
    readmeVariableValue: 'readmeVariableValue';
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

const readmeVariableConstruct: Construct = {
  name: 'readmeVariable',
  tokenize,
};

function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let hasValue = false;

  const start = (code: Code): State | undefined => {
    if (code !== codes.lessThan) return nok(code);

    effects.enter('readmeVariable');
    effects.enter('readmeVariableMarkerStart');
    effects.consume(code); // <
    return open2;
  };

  const open2 = (code: Code): State | undefined => {
    if (code !== codes.lessThan) return nok(code);
    effects.consume(code); // <<
    effects.exit('readmeVariableMarkerStart');
    effects.enter('readmeVariableValue');
    return value;
  };

  const value = (code: Code): State | undefined => {
    if (code === codes.greaterThan) {
      if (!hasValue) return nok(code);
      effects.exit('readmeVariableValue');
      effects.enter('readmeVariableMarkerEnd');
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
    effects.exit('readmeVariableMarkerEnd');
    effects.exit('readmeVariable');
    return ok;
  };

  return start;
}

export function variable(): Extension {
  return {
    text: { [codes.lessThan]: readmeVariableConstruct },
  };
}
