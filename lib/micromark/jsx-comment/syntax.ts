/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

/**
 * Micromark flow extension for JSX comment syntax: {/* ... *\/}
 *
 * Triggers on `{` at the start of a flow line, checks for `/*`, then consumes
 * everything (including line endings and magic blocks) until `*\/}` is found.
 * This runs as a flow construct so it takes priority over the magic block
 * tokenizer for content wrapped in JSX comments.
 *
 * Emits standard mdxFlowExpression/mdxFlowExpressionChunk token types so that
 * the existing mdxExpressionFromMarkdown() handler can process these nodes
 * without a custom fromMarkdown extension.
 *
 * The accepted grammar is mirrored by `JSX_COMMENT_REGEX` in ./pattern.ts.
 * Any change here needs a mirror change there; the parity test locks the two.
 */
function tokenizeJsxComment(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.leftCurlyBrace) return nok(code);

    effects.enter('mdxFlowExpression');
    effects.enter('mdxFlowExpressionMarker');
    effects.consume(code);
    effects.exit('mdxFlowExpressionMarker');
    return expectSlash;
  }

  function expectSlash(code: Code): State | undefined {
    if (code !== codes.slash) {
      effects.exit('mdxFlowExpression');
      return nok(code);
    }
    effects.enter('mdxFlowExpressionChunk');
    effects.consume(code);
    return expectStar;
  }

  function expectStar(code: Code): State | undefined {
    if (code !== codes.asterisk) {
      effects.exit('mdxFlowExpressionChunk');
      effects.exit('mdxFlowExpression');
      return nok(code);
    }
    effects.consume(code);
    return inside;
  }

  function before(code: Code): State | undefined {
    if (code === null) {
      effects.exit('mdxFlowExpression');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return before;
    }

    effects.enter('mdxFlowExpressionChunk');
    return inside(code);
  }

  function inside(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('mdxFlowExpressionChunk');
      return before(code);
    }

    if (code === codes.asterisk) {
      effects.consume(code);
      return maybeClosed;
    }

    effects.consume(code);
    return inside;
  }

  function maybeClosed(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('mdxFlowExpressionChunk');
      return before(code);
    }

    if (code === codes.slash) {
      effects.consume(code);
      return expectClosingBrace;
    }

    if (code === codes.asterisk) {
      effects.consume(code);
      return maybeClosed;
    }

    effects.consume(code);
    return inside;
  }

  function expectClosingBrace(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('mdxFlowExpressionChunk');
      return before(code);
    }

    if (code === codes.rightCurlyBrace) {
      effects.exit('mdxFlowExpressionChunk');
      effects.enter('mdxFlowExpressionMarker');
      effects.consume(code);
      effects.exit('mdxFlowExpressionMarker');
      effects.exit('mdxFlowExpression');
      return ok;
    }

    if (code === codes.asterisk) {
      effects.consume(code);
      return maybeClosed;
    }

    effects.consume(code);
    return inside;
  }
}

export function jsxComment(): Extension {
  return {
    flow: {
      [codes.leftCurlyBrace]: {
        name: 'jsxComment',
        concrete: true,
        tokenize: tokenizeJsxComment,
      },
    },
  };
}
