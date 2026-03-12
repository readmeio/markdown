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
  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.lessThan) return nok(code);
    effects.enter('jsxTable');
    effects.enter('jsxTableData');
    effects.consume(code);
    return expectT;
  }

  function expectT(code: Code): State | undefined {
    if (code !== codes.uppercaseT) return nok(code);
    effects.consume(code);
    return expectA;
  }

  function expectA(code: Code): State | undefined {
    if (code !== codes.lowercaseA) return nok(code);
    effects.consume(code);
    return expectB;
  }

  function expectB(code: Code): State | undefined {
    if (code !== codes.lowercaseB) return nok(code);
    effects.consume(code);
    return expectL;
  }

  function expectL(code: Code): State | undefined {
    if (code !== codes.lowercaseL) return nok(code);
    effects.consume(code);
    return expectE;
  }

  function expectE(code: Code): State | undefined {
    if (code !== codes.lowercaseE) return nok(code);
    effects.consume(code);
    return afterTagName;
  }

  function afterTagName(code: Code): State | undefined {
    if (code === codes.greaterThan || code === codes.slash || code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return body;
    }
    return nok(code);
  }

  function body(code: Code): State | undefined {
    if (code === null) {
      effects.exit('jsxTableData');
      effects.exit('jsxTable');
      return ok(code);
    }

    if (markdownLineEnding(code)) {
      effects.exit('jsxTableData');
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
      return closeT;
    }
    return body(code);
  }

  function closeT(code: Code): State | undefined {
    if (code === codes.uppercaseT) {
      effects.consume(code);
      return closeA;
    }
    return body(code);
  }

  function closeA(code: Code): State | undefined {
    if (code === codes.lowercaseA) {
      effects.consume(code);
      return closeB;
    }
    return body(code);
  }

  function closeB(code: Code): State | undefined {
    if (code === codes.lowercaseB) {
      effects.consume(code);
      return closeL;
    }
    return body(code);
  }

  function closeL(code: Code): State | undefined {
    if (code === codes.lowercaseL) {
      effects.consume(code);
      return closeE;
    }
    return body(code);
  }

  function closeE(code: Code): State | undefined {
    if (code === codes.lowercaseE) {
      effects.consume(code);
      return closeGt;
    }
    return body(code);
  }

  function closeGt(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      return afterClose;
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
    effects.exit('jsxTable');
    return ok(code);
  }
}

function tokenizeNonLazyContinuationStart(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
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
 * Micromark extension that tokenizes `<Table>...</Table>` as a single flow block.
 *
 * Prevents CommonMark HTML block type 6 from matching `<Table>` (case-insensitive
 * match against `table`) and fragmenting it at blank lines.
 */
export function jsxTable(): Extension {
  return {
    flow: {
      [codes.lessThan]: [jsxTableConstruct],
    },
  };
}
