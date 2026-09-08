/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, State, TokenizeContext } from 'micromark-util-types';

import { asciiAlpha, markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

/**
 * Partial constructs the `mdxComponent` tokenizer runs via `effects.check` to
 * decide whether the next line continues the block. They live here (not in
 * `syntax.ts`) because they hold none of `createTokenize`'s closure state — each
 * is a self-contained, single-line lookahead.
 */

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

// A markup-only line opens with a tag (`<x`/`</x`) and ends (ignoring trailing
// spaces) at a `>`. That distinguishes a structural continuation like
// `<span>b</span></div>` from a paragraph like `<b>Note:</b> read *this*`.
function tokenizeMarkupOnlyContinuation(effects: Effects, ok: State, nok: State) {
  let lastNonSpace: Code = null;

  return start;

  function start(code: Code): State | undefined {
    // Caller guarantees we are at `<` at the (already de-indented) line start.
    effects.enter(types.data);
    effects.consume(code);
    return afterLessThan;
  }

  function afterLessThan(code: Code): State | undefined {
    if (code === codes.slash) {
      effects.consume(code);
      return afterSlash;
    }
    return afterSlash(code);
  }

  // The `<` (or `</`) must introduce a real tag, not a stray `<` in prose.
  function afterSlash(code: Code): State | undefined {
    if (asciiAlpha(code)) {
      lastNonSpace = code;
      effects.consume(code);
      return scanToLineEnd;
    }
    effects.exit(types.data);
    return nok(code);
  }

  function scanToLineEnd(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit(types.data);
      return lastNonSpace === codes.greaterThan ? ok(code) : nok(code);
    }
    if (!markdownSpace(code)) lastNonSpace = code;
    effects.consume(code);
    return scanToLineEnd;
  }
}

// A line ending whose next line isn't a lazy paragraph continuation. Checked so a
// component body's blank/continuation lines aren't stolen by an interrupted paragraph.
export const nonLazyContinuationStart: Construct = {
  tokenize: tokenizeNonLazyContinuationStart,
  partial: true,
};

// Lookahead for `plainClaimLineStart`: is this line markup-only, or a paragraph
// that merely starts with a tag? Run via `effects.check` so it never consumes.
export const markupOnlyContinuation: Construct = {
  tokenize: tokenizeMarkupOnlyContinuation,
  partial: true,
};
