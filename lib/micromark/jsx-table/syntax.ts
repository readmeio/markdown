/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    jsxTable: 'jsxTable';
    jsxTableData: 'jsxTableData';
  }
}

const nonLazyContinuationStart: Construct = {
  tokenize: tokenizeNonLazyContinuationStart,
  partial: true,
};

function resolveToJsxTable(events: Parameters<Resolver>[0]) {
  let index = events.length;

  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'jsxTable') {
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

const jsxTableConstruct: Construct = {
  name: 'jsxTable',
  tokenize: tokenizeJsxTable,
  resolveTo: resolveToJsxTable,
  concrete: true,
};

function tokenizeJsxTable(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  let codeSpanOpenSize = 0;
  let codeSpanCloseSize = 0;
  let depth = 1;

  const ABLE_SUFFIX: Code[] = [codes.lowercaseA, codes.lowercaseB, codes.lowercaseL, codes.lowercaseE];

  /** Build a state chain that matches a sequence of character codes. */
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

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.lessThan) return nok(code);
    effects.enter('jsxTable');
    effects.enter('jsxTableData');
    effects.consume(code);
    return afterLessThan;
  }

  function afterLessThan(code: Code): State | undefined {
    if (code === codes.uppercaseT || code === codes.lowercaseT) {
      effects.consume(code);
      return matchChars(ABLE_SUFFIX, afterTagName, nok);
    }
    return nok(code);
  }

  function afterTagName(code: Code): State | undefined {
    if (code === codes.greaterThan || code === codes.slash || code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return body;
    }
    return nok(code);
  }

  function body(code: Code): State | undefined {
    // Reject unclosed <Table> so it falls back to normal HTML block parsing
    // instead of swallowing all subsequent content to EOF
    if (code === null) {
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      effects.exit('jsxTableData');
      return continuationStart(code);
    }

    if (code === codes.backslash) {
      effects.consume(code);
      return escapedChar;
    }

    if (code === codes.lessThan) {
      effects.consume(code);
      return closeSlash;
    }

    // Skip over backtick code spans so `</Table>` in inline code isn't
    // treated as the closing tag
    if (code === codes.graveAccent) {
      codeSpanOpenSize = 0;
      return countOpenTicks(code);
    }

    effects.consume(code);
    return body;
  }

  function countOpenTicks(code: Code): State | undefined {
    if (code === codes.graveAccent) {
      codeSpanOpenSize += 1;
      effects.consume(code);
      return countOpenTicks;
    }
    return inCodeSpan(code);
  }

  function inCodeSpan(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return body(code);
    if (code === codes.graveAccent) {
      codeSpanCloseSize = 0;
      return countCloseTicks(code);
    }
    effects.consume(code);
    return inCodeSpan;
  }

  function countCloseTicks(code: Code): State | undefined {
    if (code === codes.graveAccent) {
      codeSpanCloseSize += 1;
      effects.consume(code);
      return countCloseTicks;
    }
    return codeSpanCloseSize === codeSpanOpenSize ? body(code) : inCodeSpan(code);
  }

  function escapedChar(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return body(code);
    }
    effects.consume(code);
    return body;
  }

  function closeSlash(code: Code): State | undefined {
    if (code === codes.slash) {
      effects.consume(code);
      return closeTagFirstChar;
    }
    if (code === codes.uppercaseT || code === codes.lowercaseT) {
      effects.consume(code);
      return matchChars(ABLE_SUFFIX, openAfterTagName, body);
    }
    return body(code);
  }

  function closeTagFirstChar(code: Code): State | undefined {
    if (code === codes.uppercaseT || code === codes.lowercaseT) {
      effects.consume(code);
      return matchChars(ABLE_SUFFIX, closeGt, body);
    }
    return body(code);
  }

  function openAfterTagName(code: Code): State | undefined {
    if (code === codes.greaterThan || code === codes.slash || code === codes.space || code === codes.horizontalTab) {
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
        return afterClose;
      }
      return body;
    }
    return body(code);
  }

  function afterClose(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('jsxTableData');
      effects.exit('jsxTable');
      return ok(code);
    }
    effects.consume(code);
    return afterClose;
  }

  // Line ending handling — follows the htmlFlow pattern
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
    effects.enter('jsxTableData');
    return body(code);
  }

  function continuationAfter(code: Code): State | undefined {
    // At EOF without </Table>, reject so content isn't swallowed
    if (code === null) {
      return nok(code);
    }
    effects.exit('jsxTable');
    return ok(code);
  }
}

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

/**
 * Micromark extension that tokenizes `<Table>...</Table>` and `<table>...</table>`
 * as a single flow block.
 *
 * Prevents CommonMark HTML block type 6 from fragmenting table blocks at blank lines.
 */
export function jsxTable(): Extension {
  return {
    flow: {
      [codes.lessThan]: [jsxTableConstruct],
    },
  };
}
