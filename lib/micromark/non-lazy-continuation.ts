/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { types } from 'micromark-util-symbol';

function tokenizeNonLazyContinuationStart(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self = this;

  return start;

  function start(code: Code): State | undefined {
    if (markdownLineEnding(code)) {
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      return after;
    }
    return nok(code);
  }

  function after(code: Code): State | undefined {
    if (self.parser.lazy[self.now().line]) {
      return nok(code);
    }
    return ok(code);
  }
}

export const nonLazyContinuationStart: Construct = {
  tokenize: tokenizeNonLazyContinuationStart,
  partial: true,
};
