/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, State } from 'micromark-util-types';

import { asciiAlpha, markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

/**
 * Partial construct the `mdxComponent` tokenizer runs via `effects.check` to
 * decide whether the next line continues the block. It lives here (not in
 * `syntax.ts`) because it holds none of `createTokenize`'s closure state — it
 * is a self-contained, single-line lookahead.
 */

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

// Lookahead for `plainClaimLineStart`: is this line markup-only, or a paragraph
// that merely starts with a tag? Run via `effects.check` so it never consumes.
export const markupOnlyContinuation: Construct = {
  tokenize: tokenizeMarkupOnlyContinuation,
  partial: true,
};
