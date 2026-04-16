/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    htmlBlockComponent: 'htmlBlockComponent';
    htmlBlockComponentData: 'htmlBlockComponentData';
  }
}

const TAG_SUFFIX: Code[] = [
  codes.uppercaseT,
  codes.uppercaseM,
  codes.uppercaseL,
  codes.uppercaseB,
  codes.lowercaseL,
  codes.lowercaseO,
  codes.lowercaseC,
  codes.lowercaseK,
];

// ---------------------------------------------------------------------------
// Shared tokenizer factory
// ---------------------------------------------------------------------------

/**
 * Creates a tokenize function for `<HTMLBlock>...</HTMLBlock>`.
 *
 * - **flow** (block-level): supports multiline content via line continuations,
 *   consumes trailing whitespace after the closing tag.
 * - **text** (inline): single-line only, exits immediately after the closing tag.
 */
function createTokenize(mode: 'flow' | 'text') {
  return function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
    let depth = 1;

    function matchChars(chars: Code[], onMatch: State, onFail: (code: Code) => State | undefined): State {
      if (chars.length === 0) return onMatch;
      return ((code: Code): State | undefined => {
        if (code === chars[0]) {
          effects.consume(code);
          return matchChars(chars.slice(1), onMatch, onFail);
        }
        return onFail(code);
      }) as State;
    }

    function matchTagName(onMatch: State, onFail: (code: Code) => State | undefined): State {
      return ((code: Code): State | undefined => {
        if (code === codes.uppercaseH) {
          effects.consume(code);
          return matchChars(TAG_SUFFIX, onMatch, onFail);
        }
        return onFail(code);
      }) as State;
    }

    return start;

    function start(code: Code): State | undefined {
      if (code !== codes.lessThan) return nok(code);
      effects.enter('htmlBlockComponent');
      effects.enter('htmlBlockComponentData');
      effects.consume(code);
      return matchTagName(afterTagName, nok);
    }

    function afterTagName(code: Code): State | undefined {
      if (code === codes.greaterThan) {
        effects.consume(code);
        return body;
      }
      if (code === codes.space || code === codes.horizontalTab) {
        effects.consume(code);
        return inAttributes;
      }
      if (mode === 'flow' && markdownLineEnding(code)) {
        effects.exit('htmlBlockComponentData');
        return attributeContinuationStart(code);
      }
      if (code === codes.slash) {
        effects.consume(code);
        return selfClose;
      }
      return nok(code);
    }

    function inAttributes(code: Code): State | undefined {
      if (code === codes.greaterThan) {
        effects.consume(code);
        return body;
      }
      if (code === null) {
        return nok(code);
      }
      if (markdownLineEnding(code)) {
        if (mode === 'text') return nok(code);
        effects.exit('htmlBlockComponentData');
        return attributeContinuationStart(code);
      }
      effects.consume(code);
      return inAttributes;
    }

    function attributeContinuationStart(code: Code): State | undefined {
      return effects.check(nonLazyContinuationStart, attributeContinuationNonLazy, continuationAfter)(code);
    }

    function attributeContinuationNonLazy(code: Code): State | undefined {
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      return attributeContinuationBefore;
    }

    function attributeContinuationBefore(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        return attributeContinuationStart(code);
      }
      effects.enter('htmlBlockComponentData');
      return inAttributes(code);
    }

    function selfClose(code: Code): State | undefined {
      if (code === codes.greaterThan) {
        effects.consume(code);
        return mode === 'flow' ? afterClose : done(code);
      }
      return nok(code);
    }

    function body(code: Code): State | undefined {
      if (code === null) return nok(code);

      if (markdownLineEnding(code)) {
        if (mode === 'text') {
          // Text constructs operate on paragraph content which spans lines
          effects.consume(code);
          return body;
        }
        effects.exit('htmlBlockComponentData');
        return continuationStart(code);
      }

      if (code === codes.lessThan) {
        effects.consume(code);
        return closeSlash;
      }

      effects.consume(code);
      return body;
    }

    function closeSlash(code: Code): State | undefined {
      if (code === codes.slash) {
        effects.consume(code);
        return matchTagName(closeGt, body);
      }
      return matchTagName(openAfterTagName, body)(code);
    }

    function openAfterTagName(code: Code): State | undefined {
      if (code === codes.greaterThan || code === codes.space || code === codes.horizontalTab) {
        depth += 1;
        effects.consume(code);
        return body;
      }
      return body(code);
    }

    function closeGt(code: Code): State | undefined {
      if (code === codes.greaterThan) {
        depth -= 1;
        effects.consume(code);
        if (depth === 0) {
          return mode === 'flow' ? afterClose : done(code);
        }
        return body;
      }
      return body(code);
    }

    // -- flow-only states ---------------------------------------------------

    function afterClose(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        return done(code);
      }
      if (code === codes.space || code === codes.horizontalTab) {
        effects.consume(code);
        return afterClose;
      }
      // Reject so the block re-parses as a paragraph, deferring to the
      // text tokenizer which preserves trailing content in the same line.
      return nok(code);
    }

    // -- flow-only: line continuation ---------------------------------------

    function continuationStart(code: Code): State | undefined {
      return effects.check(nonLazyContinuationStart, continuationStartNonLazy, continuationAfter)(code);
    }

    function continuationStartNonLazy(code: Code): State | undefined {
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      return continuationBefore;
    }

    function continuationBefore(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        return continuationStart(code);
      }
      effects.enter('htmlBlockComponentData');
      return body(code);
    }

    function continuationAfter(code: Code): State | undefined {
      if (code === null) return nok(code);
      effects.exit('htmlBlockComponent');
      return ok(code);
    }

    // -- shared exit --------------------------------------------------------

    function done(_code: Code): State | undefined {
      effects.exit('htmlBlockComponentData');
      effects.exit('htmlBlockComponent');
      return ok(_code);
    }
  };
}

// ---------------------------------------------------------------------------
// Flow construct (block-level)
// ---------------------------------------------------------------------------

const nonLazyContinuationStart: Construct = {
  tokenize: tokenizeNonLazyContinuationStart,
  partial: true,
};

function resolveToHtmlBlockComponent(events: Parameters<Resolver>[0]) {
  let index = events.length;

  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'htmlBlockComponent') {
      break;
    }
  }

  if (index > 1 && events[index - 2][1].type === types.linePrefix) {
    events[index][1].start = events[index - 2][1].start;
    events[index + 1][1].start = events[index - 2][1].start;
    events.splice(index - 2, 2);
  }

  return events;
}

const htmlBlockComponentFlowConstruct: Construct = {
  name: 'htmlBlockComponent',
  tokenize: createTokenize('flow'),
  resolveTo: resolveToHtmlBlockComponent,
  concrete: true,
};

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

// ---------------------------------------------------------------------------
// Text construct (inline)
// ---------------------------------------------------------------------------

const htmlBlockComponentTextConstruct: Construct = {
  name: 'htmlBlockComponent',
  tokenize: createTokenize('text'),
};

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

/**
 * Micromark extension that tokenizes `<HTMLBlock>...</HTMLBlock>` as a single
 * token at both flow (block) and text (inline) levels.
 *
 * Prevents the markdown parser from consuming `<script>/<style>` tags inside
 * the block, and ensures blockquote `> ` markers are properly stripped before
 * the content is captured.
 */
export function htmlBlockComponent(): Extension {
  return {
    flow: {
      [codes.lessThan]: [htmlBlockComponentFlowConstruct],
    },
    text: {
      [codes.lessThan]: [htmlBlockComponentTextConstruct],
    },
  };
}
