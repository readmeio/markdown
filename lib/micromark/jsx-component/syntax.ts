/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

import { nonLazyContinuationStart } from '../non-lazy-continuation';

import { matchSequence, suffixForFirstChar } from './tags';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    jsxComponentBlock: 'jsxComponentBlock';
    jsxComponentBlockData: 'jsxComponentBlockData';
    jsxComponentText: 'jsxComponentText';
  }
}

function resolveToBlock(events: Parameters<Resolver>[0]) {
  let index = events.length;

  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'jsxComponentBlock') {
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

const flowConstruct: Construct = {
  name: 'jsxComponentBlock',
  tokenize: tokenizeFlow,
  resolveTo: resolveToBlock,
  concrete: true,
};

const textConstruct: Construct = {
  name: 'jsxComponentText',
  tokenize: tokenizeText,
};

function createFirstChar(
  tagName: Code[],
  effects: Effects,
  afterTagName: State,
  nok: State,
): State {
  return ((code: Code): State | undefined => {
    const suffix = suffixForFirstChar(code);
    if (!suffix) return nok(code);
    tagName.push(code);
    effects.consume(code);
    return matchSequence(suffix, 0, tagName, effects, afterTagName, nok);
  }) as State;
}

function createInDoubleQuote(effects: Effects, nok: State, returnTo: State): State {
  const self: State = ((code: Code): State | undefined => {
    if (code === null || markdownLineEnding(code)) return nok(code);
    effects.consume(code);
    return code === codes.quotationMark ? returnTo : self;
  }) as State;
  return self;
}

function createInSingleQuote(effects: Effects, nok: State, returnTo: State): State {
  const self: State = ((code: Code): State | undefined => {
    if (code === null || markdownLineEnding(code)) return nok(code);
    effects.consume(code);
    return code === codes.apostrophe ? returnTo : self;
  }) as State;
  return self;
}

// ---------------------------------------------------------------------------
// Flow construct: block-level component tags
//
// Matches known ReadMe component/tag names (Image, img, Callout, Embed,
// Recipe, Anchor) with relaxed attribute parsing so unquoted URLs aren't
// fragmented by GFM autolinks. Supports multi-line attribute lists.
//
// Self-closing tags (<Image src=... />) are captured as single-line blocks.
// Opening tags (<Callout icon=...>) must be alone on their line; the body is
// scanned until the matching closing tag, following the jsxTable pattern.
// ---------------------------------------------------------------------------

function tokenizeFlow(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  const tagName: Code[] = [];
  let closingTagIndex = 0;
  let depth = 1;

  const inDoubleQuote = createInDoubleQuote(effects, nok, inTag);
  const inSingleQuote = createInSingleQuote(effects, nok, inTag);

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.lessThan) return nok(code);
    effects.enter('jsxComponentBlock');
    effects.enter('jsxComponentBlockData');
    effects.consume(code);
    return createFirstChar(tagName, effects, afterTagName, nok);
  }

  function afterTagName(code: Code): State | undefined {
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return inTag;
    }
    if (code === codes.greaterThan) {
      effects.consume(code);
      return afterOpeningGt;
    }
    if (code === codes.slash) {
      effects.consume(code);
      return selfCloseGt;
    }
    if (markdownLineEnding(code)) {
      effects.exit('jsxComponentBlockData');
      return tagAtLineEnding(code);
    }
    return nok(code);
  }

  function inTag(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) {
      effects.exit('jsxComponentBlockData');
      return tagAtLineEnding(code);
    }
    if (code === codes.greaterThan) {
      effects.consume(code);
      return afterOpeningGt;
    }
    if (code === codes.quotationMark) {
      effects.consume(code);
      return inDoubleQuote;
    }
    if (code === codes.apostrophe) {
      effects.consume(code);
      return inSingleQuote;
    }
    if (code === codes.slash) {
      effects.consume(code);
      return maybeSlashClose;
    }
    effects.consume(code);
    return inTag;
  }

  function maybeSlashClose(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      return afterSelfClose;
    }
    return inTag(code);
  }

  function selfCloseGt(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      return afterSelfClose;
    }
    return nok(code);
  }

  function afterSelfClose(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('jsxComponentBlockData');
      effects.exit('jsxComponentBlock');
      return ok(code);
    }
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return afterSelfClose;
    }
    return nok(code);
  }

  function tagAtLineEnding(code: Code): State | undefined {
    if (code === null) return nok(code);
    return effects.check(nonLazyContinuationStart, tagContinuationNonLazy, nok)(code);
  }

  function tagContinuationNonLazy(code: Code): State | undefined {
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return tagContinuationBefore;
  }

  function tagContinuationBefore(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return tagAtLineEnding(code);
    }
    effects.enter('jsxComponentBlockData');
    return inTag(code);
  }

  function afterOpeningGt(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('jsxComponentBlockData');
      return bodyAtLineEnding(code);
    }
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return afterOpeningGt;
    }
    return nok(code);
  }

  function bodyAtLineEnding(code: Code): State | undefined {
    if (code === null) {
      effects.exit('jsxComponentBlock');
      return ok(code);
    }
    return effects.check(nonLazyContinuationStart, bodyContinuationNonLazy, bodyContinuationAfter)(code);
  }

  function bodyContinuationNonLazy(code: Code): State | undefined {
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return bodyContinuationBefore;
  }

  function bodyContinuationBefore(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return bodyAtLineEnding(code);
    }
    effects.enter('jsxComponentBlockData');
    return body(code);
  }

  function bodyContinuationAfter(code: Code): State | undefined {
    if (code === null) {
      return nok(code);
    }
    effects.exit('jsxComponentBlock');
    return ok(code);
  }

  function body(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) {
      effects.exit('jsxComponentBlockData');
      return bodyAtLineEnding(code);
    }
    if (code === codes.lessThan) {
      effects.consume(code);
      return bodyAfterLt;
    }
    effects.consume(code);
    return body;
  }

  function bodyAfterLt(code: Code): State | undefined {
    if (code === codes.slash) {
      effects.consume(code);
      closingTagIndex = 0;
      return closingTagMatch;
    }
    if (tagName.length > 0 && code === tagName[0]) {
      effects.consume(code);
      closingTagIndex = 1;
      return nestedOpenTagMatch;
    }
    return body(code);
  }

  function nestedOpenTagMatch(code: Code): State | undefined {
    if (closingTagIndex < tagName.length && code === tagName[closingTagIndex]) {
      closingTagIndex += 1;
      effects.consume(code);
      return nestedOpenTagMatch;
    }
    if (
      closingTagIndex === tagName.length &&
      (code === codes.greaterThan || code === codes.space || code === codes.horizontalTab || code === codes.slash)
    ) {
      depth += 1;
      effects.consume(code);
      return body;
    }
    return body(code);
  }

  function closingTagMatch(code: Code): State | undefined {
    if (closingTagIndex < tagName.length && code === tagName[closingTagIndex]) {
      closingTagIndex += 1;
      effects.consume(code);
      return closingTagMatch;
    }
    if (closingTagIndex === tagName.length && code === codes.greaterThan) {
      depth -= 1;
      effects.consume(code);
      if (depth === 0) {
        return afterBlockClose;
      }
      return body;
    }
    return body(code);
  }

  function afterBlockClose(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('jsxComponentBlockData');
      effects.exit('jsxComponentBlock');
      return ok(code);
    }
    effects.consume(code);
    return afterBlockClose;
  }
}

// ---------------------------------------------------------------------------
// Text construct: inline component tags (single-line only)
// ---------------------------------------------------------------------------

function tokenizeText(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  const tagName: Code[] = [];

  const inDoubleQuote = createInDoubleQuote(effects, nok, inTag);
  const inSingleQuote = createInSingleQuote(effects, nok, inTag);

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.lessThan) return nok(code);
    effects.enter('jsxComponentText');
    effects.consume(code);
    return createFirstChar(tagName, effects, afterTagName, nok);
  }

  function afterTagName(code: Code): State | undefined {
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return inTag;
    }
    if (code === codes.greaterThan) {
      effects.consume(code);
      effects.exit('jsxComponentText');
      return ok(code);
    }
    if (code === codes.slash) {
      effects.consume(code);
      return selfCloseGt;
    }
    return nok(code);
  }

  function inTag(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);
    if (code === codes.greaterThan) {
      effects.consume(code);
      effects.exit('jsxComponentText');
      return ok(code);
    }
    if (code === codes.quotationMark) {
      effects.consume(code);
      return inDoubleQuote;
    }
    if (code === codes.apostrophe) {
      effects.consume(code);
      return inSingleQuote;
    }
    if (code === codes.slash) {
      effects.consume(code);
      return maybeSlashClose;
    }
    effects.consume(code);
    return inTag;
  }

  function maybeSlashClose(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      effects.exit('jsxComponentText');
      return ok(code);
    }
    return inTag(code);
  }

  function selfCloseGt(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      effects.exit('jsxComponentText');
      return ok(code);
    }
    return nok(code);
  }
}

/**
 * Micromark extension that tokenizes known ReadMe component tags (Image, img,
 * Callout, Embed, Recipe, Anchor) with relaxed attribute parsing.
 *
 * Micromark's built-in HTML block tokenizer rejects tags whose unquoted
 * attribute values contain characters like `:` or `/`. GFM autolinks then
 * fragment the URLs into link nodes, breaking component rendering. This
 * extension bypasses the strict validation for these specific tag names.
 */
export function jsxComponentBlock(): Extension {
  return {
    flow: {
      [codes.lessThan]: [flowConstruct],
    },
    text: {
      [codes.lessThan]: [textConstruct],
    },
  };
}
