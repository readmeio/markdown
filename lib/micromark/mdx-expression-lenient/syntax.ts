/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

/**
 * Lenient MDX text-expression tokenizer (agnostic / no acorn).
 *
 * Matches a balanced `{ ... }` run — tracking nested braces and spanning soft
 * line breaks — and emits the standard `mdxTextExpression*` tokens so the
 * upstream `mdxExpressionFromMarkdown()` builds the node. 
 * 
 * This reimplements the official micromark mdxExpression, but unlike the upstream
 * factory, an unbalanced brace that reaches end of input returns `nok` rather
 * than throwing: micromark rolls back and the `{` renders as literal text. This
 * makes the pipeline more forgiving of unbalanced braces, which the original 
 * mdxExpression would be sensitive to.
 */
function tokenizeTextExpression(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let depth = 0;

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.leftCurlyBrace) return nok(code);

    effects.enter('mdxTextExpression');
    effects.enter('mdxTextExpressionMarker');
    effects.consume(code);
    effects.exit('mdxTextExpressionMarker');
    return before;
  }

  function before(code: Code): State | undefined {
    if (code === codes.eof) {
      effects.exit('mdxTextExpression');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return before;
    }

    if (code === codes.rightCurlyBrace && depth === 0) {
      return close(code);
    }

    effects.enter('mdxTextExpressionChunk');
    return inside(code);
  }

  function inside(code: Code): State | undefined {
    if (code === codes.eof || markdownLineEnding(code)) {
      effects.exit('mdxTextExpressionChunk');
      return before(code);
    }

    if (code === codes.rightCurlyBrace && depth === 0) {
      effects.exit('mdxTextExpressionChunk');
      return close(code);
    }

    if (code === codes.leftCurlyBrace) depth += 1;
    else if (code === codes.rightCurlyBrace) depth -= 1;

    effects.consume(code);
    return inside;
  }

  function close(code: Code): State | undefined {
    effects.enter('mdxTextExpressionMarker');
    effects.consume(code);
    effects.exit('mdxTextExpressionMarker');
    effects.exit('mdxTextExpression');
    return ok;
  }
}

export function mdxExpressionLenient(): Extension {
  return {
    text: {
      [codes.leftCurlyBrace]: {
        name: 'mdxTextExpression',
        tokenize: tokenizeTextExpression,
      },
    },
  };
}
