/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    dnt: 'dnt';
    dntData: 'dntData';
  }
}

const TAG_NAME: Code[] = [codes.uppercaseD, codes.uppercaseN, codes.uppercaseT];

/** Pulls the indent before `<DNT>` into the token, so the node starts where its line does. */
function resolveToDnt(events: Parameters<Resolver>[0]) {
  let index = events.length;

  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'dnt') break;
  }

  if (index > 1 && events[index - 2][1].type === types.linePrefix) {
    events[index][1].start = events[index - 2][1].start;
    events[index + 1][1].start = events[index - 2][1].start;
    events.splice(index - 2, 2);
  }

  return events;
}

// One token per `<DNT>…</DNT>`, skipping closers in code, fences, `{…}` and nested DNTs.
// Flow claims the block form (shape rule in `afterClose`), text the inline form.
function createTokenize(mode: 'flow' | 'text') {
  const isFlow = mode === 'flow';

  return function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let depth = 0;
    let nameIndex = 0;
    // micromark wants content inside a data token, closed around each line ending.
    let dataOpen = false;

    // Block shape, flow only.
    let openerAlone = true;
    let sawLineEnding = false;
    let sawBlankLine = false;
    let closerOpensLine = false;
    // Only spaces so far on this line.
    let atLineStart = false;
    let tagOpensLine = false;

    let quoteChar: Code = null;
    let braceDepth = 0;
    let inTemplateLiteral = false;
    // braceDepth at each `${`, so its `}` returns to the template literal.
    const templateStack: number[] = [];

    let codeSpanOpenSize = 0;
    let codeSpanCloseSize = 0;
    let fenceChar: Code = null;
    let fenceLength = 0;
    let fenceCloseLength = 0;

    return start;

    function start(code: Code): State | undefined {
      // Under a paragraph line a `<DNT>` stays inline, like any html block.
      if (code !== codes.lessThan || (isFlow && self.interrupt)) return nok(code);
      effects.enter('dnt');
      consumeData(code);
      nameIndex = 0;
      return openTagName;
    }

    function openTagName(code: Code): State | undefined {
      if (code !== TAG_NAME[nameIndex]) return nok(code);
      nameIndex += 1;
      consumeData(code);
      return nameIndex === TAG_NAME.length ? afterOpenTagName : openTagName;
    }

    // `<DNTx>` is another tag and `<DNT />` has no body: neither is this construct.
    function afterOpenTagName(code: Code): State | undefined {
      if (code === codes.greaterThan) return openTagEnd(code);
      if (markdownSpace(code)) {
        consumeData(code);
        return attributes;
      }
      return nok(code);
    }

    function attributes(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code) || code === codes.slash) return nok(code);
      if (code === codes.greaterThan) return openTagEnd(code);
      if (code === codes.quotationMark || code === codes.apostrophe) {
        quoteChar = code;
        consumeData(code);
        return attributeString;
      }
      if (code === codes.leftCurlyBrace) {
        braceDepth = 1;
        consumeData(code);
        return attributeExpression;
      }
      consumeData(code);
      return attributes;
    }

    function attributeString(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return nok(code);
      consumeData(code);
      if (code !== quoteChar) return attributeString;
      quoteChar = null;
      return attributes;
    }

    function attributeExpression(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return nok(code);
      if (code === codes.leftCurlyBrace) braceDepth += 1;
      if (code === codes.rightCurlyBrace) braceDepth -= 1;
      consumeData(code);
      return braceDepth === 0 ? attributes : attributeExpression;
    }

    function openTagEnd(code: Code): State | undefined {
      consumeData(code);
      depth = 1;
      return isFlow ? openerRest : body;
    }

    function openerRest(code: Code): State | undefined {
      if (markdownSpace(code)) {
        consumeData(code);
        return openerRest;
      }
      if (markdownLineEnding(code)) return lineEnding(code, bodyLineStart);
      openerAlone = false;
      return body(code);
    }

    // ── Body ──────────────────────────────────────────────────────────────

    function body(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, bodyLineStart);
      if (atLineStart && markdownSpace(code)) {
        consumeData(code);
        return body;
      }
      if (code === codes.graveAccent) {
        codeSpanOpenSize = 0;
        return countOpenTicks(code);
      }
      if (isFlow && atLineStart && code === codes.tilde) {
        fenceCloseLength = 0;
        return countTildes(code);
      }

      tagOpensLine = atLineStart;
      atLineStart = false;
      if (code === codes.backslash) {
        consumeData(code);
        return escaped;
      }
      if (code === codes.leftCurlyBrace) {
        braceDepth = 1;
        inTemplateLiteral = false;
        consumeData(code);
        return braceExpression;
      }
      if (code === codes.lessThan) {
        consumeData(code);
        return afterLessThan;
      }
      consumeData(code);
      return body;
    }

    function bodyLineStart(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, bodyLineStart);
      return body(code);
    }

    function consumeData(code: Code): void {
      if (!dataOpen) {
        effects.enter('dntData');
        dataOpen = true;
      }
      effects.consume(code);
    }

    function exitData(): void {
      if (!dataOpen) return;
      effects.exit('dntData');
      dataOpen = false;
    }

    function lineEnding(code: Code, next: State): State | undefined {
      // Only spaces since the last line ending: a blank line.
      if (atLineStart) sawBlankLine = true;
      sawLineEnding = true;
      exitData();
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      atLineStart = true;
      return next;
    }

    function escaped(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return body(code);
      consumeData(code);
      return body;
    }

    // ── Tags in the body ──────────────────────────────────────────────────

    function afterLessThan(code: Code): State | undefined {
      nameIndex = 0;
      if (code !== codes.slash) return nestedOpenTagName(code);
      consumeData(code);
      return closeTagName;
    }

    // A nested `<DNT>` adds a level, so its closer cant end the outer one.
    function nestedOpenTagName(code: Code): State | undefined {
      if (nameIndex < TAG_NAME.length) {
        if (code !== TAG_NAME[nameIndex]) return body(code);
        nameIndex += 1;
        consumeData(code);
        return nestedOpenTagName;
      }
      if (code === codes.greaterThan || code === codes.slash || markdownSpace(code) || markdownLineEnding(code)) {
        depth += 1;
      }
      return body(code);
    }

    function closeTagName(code: Code): State | undefined {
      if (nameIndex < TAG_NAME.length) {
        if (code !== TAG_NAME[nameIndex]) return body(code);
        nameIndex += 1;
        consumeData(code);
        return closeTagName;
      }
      if (code !== codes.greaterThan) return body(code);
      depth -= 1;
      consumeData(code);
      if (depth > 0) return body;
      if (!isFlow) return exitAfterClose;
      closerOpensLine = tagOpensLine;
      return afterClose;
    }

    function exitAfterClose(code: Code): State | undefined {
      exitData();
      effects.exit('dnt');
      return ok(code);
    }

    // Text after the opener is a block only when the body has a blank line, or the
    // closer starts its own line or ends a later one. Anything else is left to text.
    function afterClose(code: Code): State | undefined {
      if (openerAlone || sawBlankLine || closerOpensLine) return afterCloseRest(code);
      if (sawLineEnding) return closerEndsLine(code);
      return nok(code);
    }

    function closerEndsLine(code: Code): State | undefined {
      if (markdownSpace(code)) {
        consumeData(code);
        return closerEndsLine;
      }
      if (code === null || markdownLineEnding(code)) return afterCloseRest(code);
      return nok(code);
    }

    // Text after the closer stays in the token, for the transform to reparse as siblings.
    function afterCloseRest(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return exitAfterClose(code);
      consumeData(code);
      return afterCloseRest;
    }

    // ── Code spans and fences ─────────────────────────────────────────────

    function countOpenTicks(code: Code): State | undefined {
      if (code === codes.graveAccent) {
        codeSpanOpenSize += 1;
        consumeData(code);
        return countOpenTicks;
      }
      const isFence = isFlow && atLineStart && codeSpanOpenSize >= 3;
      atLineStart = false;
      if (!isFence) return inCodeSpan(code);
      fenceChar = codes.graveAccent;
      fenceLength = codeSpanOpenSize;
      return inFencedCode(code);
    }

    function inCodeSpan(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, codeSpanLineStart);
      if (code === codes.graveAccent) {
        codeSpanCloseSize = 0;
        return countCloseTicks(code);
      }
      consumeData(code);
      return inCodeSpan;
    }

    // A code span crosses a soft break but not a blank line, so a second line ending ends it.
    function codeSpanLineStart(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return bodyLineStart(code);
      atLineStart = false;
      return inCodeSpan(code);
    }

    function countCloseTicks(code: Code): State | undefined {
      if (code === codes.graveAccent) {
        codeSpanCloseSize += 1;
        consumeData(code);
        return countCloseTicks;
      }
      return codeSpanCloseSize === codeSpanOpenSize ? body(code) : inCodeSpan(code);
    }

    function countTildes(code: Code): State | undefined {
      if (code === codes.tilde) {
        fenceCloseLength += 1;
        consumeData(code);
        return countTildes;
      }
      atLineStart = false;
      if (fenceCloseLength < 3) return body(code);
      fenceChar = codes.tilde;
      fenceLength = fenceCloseLength;
      return inFencedCode(code);
    }

    function inFencedCode(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, fencedLineStart);
      atLineStart = false;
      consumeData(code);
      return inFencedCode;
    }

    function fencedLineStart(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, fencedLineStart);
      fenceCloseLength = 0;
      return fenceCloseIndent(code);
    }

    // An indented fence closes on an equally indented line, so skip the indent first.
    function fenceCloseIndent(code: Code): State | undefined {
      if (markdownSpace(code)) {
        consumeData(code);
        return fenceCloseIndent;
      }
      return fenceCloseRun(code);
    }

    function fenceCloseRun(code: Code): State | undefined {
      if (code === fenceChar) {
        fenceCloseLength += 1;
        atLineStart = false;
        consumeData(code);
        return fenceCloseRun;
      }
      return fenceCloseLength < fenceLength ? inFencedCode(code) : fenceCloseTrailing(code);
    }

    function fenceCloseTrailing(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        fenceChar = null;
        return body(code);
      }
      if (markdownSpace(code)) {
        consumeData(code);
        return fenceCloseTrailing;
      }
      return inFencedCode(code);
    }

    // ── `{…}` expressions in the body ─────────────────────────────────────

    function braceExpression(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, braceLineStart);
      if (code === codes.quotationMark || code === codes.apostrophe) {
        quoteChar = code;
        consumeData(code);
        return braceString;
      }
      if (code === codes.graveAccent) {
        inTemplateLiteral = true;
        consumeData(code);
        return braceTemplateLiteral;
      }
      if (code === codes.leftCurlyBrace) braceDepth += 1;
      if (code === codes.rightCurlyBrace) braceDepth -= 1;
      consumeData(code);
      if (templateStack.length && braceDepth === templateStack[templateStack.length - 1]) {
        templateStack.pop();
        inTemplateLiteral = true;
        return braceTemplateLiteral;
      }
      return braceDepth === 0 ? body : braceExpression;
    }

    function braceLineStart(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, braceLineStart);
      atLineStart = false;
      if (quoteChar !== null) return braceString(code);
      return inTemplateLiteral ? braceTemplateLiteral(code) : braceExpression(code);
    }

    function braceString(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, braceLineStart);
      if (code === codes.backslash) {
        consumeData(code);
        return braceStringEscape;
      }
      consumeData(code);
      if (code !== quoteChar) return braceString;
      quoteChar = null;
      return braceExpression;
    }

    function braceStringEscape(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return braceString(code);
      consumeData(code);
      return braceString;
    }

    function braceTemplateLiteral(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, braceLineStart);
      if (code === codes.graveAccent) {
        inTemplateLiteral = false;
        consumeData(code);
        return braceExpression;
      }
      if (code === codes.backslash) {
        consumeData(code);
        return braceTemplateLiteralEscape;
      }
      if (code === codes.dollarSign) {
        consumeData(code);
        return braceTemplateLiteralDollar;
      }
      consumeData(code);
      return braceTemplateLiteral;
    }

    function braceTemplateLiteralEscape(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return braceTemplateLiteral(code);
      consumeData(code);
      return braceTemplateLiteral;
    }

    function braceTemplateLiteralDollar(code: Code): State | undefined {
      if (code !== codes.leftCurlyBrace) return braceTemplateLiteral(code);
      templateStack.push(braceDepth);
      braceDepth += 1;
      inTemplateLiteral = false;
      consumeData(code);
      return braceExpression;
    }
  };
}

const dntFlow: Construct = {
  name: 'dnt',
  tokenize: createTokenize('flow'),
  resolveTo: resolveToDnt,
  concrete: true,
};

const dntText: Construct = {
  name: 'dntText',
  tokenize: createTokenize('text'),
};

/** Micromark extension for the do-not-translate `<DNT>` tag, block (flow) and inline (text). */
export function dnt(): Extension {
  return {
    flow: { [codes.lessThan]: [dntFlow] },
    text: { [codes.lessThan]: [dntText] },
  };
}
