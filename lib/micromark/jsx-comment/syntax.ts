/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    jsxComment: 'jsxComment';
    jsxCommentLineEnding: 'jsxCommentLineEnding';
    jsxCommentMarkerEnd: 'jsxCommentMarkerEnd';
    jsxCommentMarkerStart: 'jsxCommentMarkerStart';
    jsxCommentValue: 'jsxCommentValue';
  }
}

/**
 * Micromark flow extension for JSX comment syntax: {/* ... *\/}
 *
 * Triggers on `{` at the start of a flow line, checks for `/*`, then consumes
 * everything (including line endings and magic blocks) until `*\/}` is found.
 * This runs as a flow construct so it takes priority over the magic block
 * tokenizer for content wrapped in JSX comments.
 *
 * The accepted grammar is mirrored by `JSX_COMMENT_REGEX` in ./pattern.ts.
 * Any change here needs a mirror change there; the parity test locks the two.
 */
function tokenizeJsxComment(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let inValue = false;

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.leftCurlyBrace) return nok(code);

    effects.enter('jsxComment');
    effects.enter('jsxCommentMarkerStart');
    effects.consume(code);
    return expectSlash;
  }

  function expectSlash(code: Code): State | undefined {
    if (code !== codes.slash) {
      effects.exit('jsxCommentMarkerStart');
      effects.exit('jsxComment');
      return nok(code);
    }
    effects.consume(code);
    return expectStar;
  }

  function expectStar(code: Code): State | undefined {
    if (code !== codes.asterisk) {
      effects.exit('jsxCommentMarkerStart');
      effects.exit('jsxComment');
      return nok(code);
    }
    effects.consume(code);
    effects.exit('jsxCommentMarkerStart');
    return content;
  }

  function enterValue(): void {
    if (!inValue) {
      effects.enter('jsxCommentValue');
      inValue = true;
    }
  }

  function exitValue(): void {
    if (inValue) {
      effects.exit('jsxCommentValue');
      inValue = false;
    }
  }

  function content(code: Code): State | undefined {
    if (code === null) {
      exitValue();
      effects.exit('jsxComment');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      exitValue();
      effects.enter('jsxCommentLineEnding');
      effects.consume(code);
      effects.exit('jsxCommentLineEnding');
      return content;
    }

    if (code === codes.asterisk) {
      enterValue();
      effects.consume(code);
      return maybeClosed;
    }

    enterValue();
    effects.consume(code);
    return content;
  }

  function maybeClosed(code: Code): State | undefined {
    if (code === null) {
      exitValue();
      effects.exit('jsxComment');
      return nok(code);
    }

    if (code === codes.slash) {
      effects.consume(code);
      return expectClosingBrace;
    }

    if (code === codes.asterisk) {
      effects.consume(code);
      return maybeClosed;
    }

    if (markdownLineEnding(code)) {
      exitValue();
      effects.enter('jsxCommentLineEnding');
      effects.consume(code);
      effects.exit('jsxCommentLineEnding');
      return content;
    }

    effects.consume(code);
    return content;
  }

  function expectClosingBrace(code: Code): State | undefined {
    if (code === null) {
      exitValue();
      effects.exit('jsxComment');
      return nok(code);
    }

    if (code === codes.rightCurlyBrace) {
      exitValue();
      effects.enter('jsxCommentMarkerEnd');
      effects.consume(code);
      effects.exit('jsxCommentMarkerEnd');
      effects.exit('jsxComment');
      return ok;
    }

    if (code === codes.asterisk) {
      effects.consume(code);
      return maybeClosed;
    }

    if (markdownLineEnding(code)) {
      exitValue();
      effects.enter('jsxCommentLineEnding');
      effects.consume(code);
      effects.exit('jsxCommentLineEnding');
      return content;
    }

    effects.consume(code);
    return content;
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
