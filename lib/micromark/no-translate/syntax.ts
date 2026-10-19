/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

import { createOpaqueRegions } from '../util/opaque-regions';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    noTranslate: 'noTranslate';
    noTranslateData: 'noTranslateData';
  }
}

const TAG_NAME: Code[] = Array.from('NoTranslate', char => char.charCodeAt(0));

/** Pulls the indent before `<NoTranslate>` into the token, so the node starts where its line does. */
function resolveToNoTranslate(events: Parameters<Resolver>[0]) {
  let index = events.length;

  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'noTranslate') break;
  }

  if (index > 1 && events[index - 2][1].type === types.linePrefix) {
    events[index][1].start = events[index - 2][1].start;
    events[index + 1][1].start = events[index - 2][1].start;
    events.splice(index - 2, 2);
  }

  return events;
}

// One token per `<NoTranslate>…</NoTranslate>`, skipping closers in code, fences, `{…}` and nested NoTranslate tags.
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
    let regionResume: State = nok;
    const regions = createOpaqueRegions({ effects, nok, consume: consumeData, lineEnding: regionLineEnding });

    return start;

    function start(code: Code): State | undefined {
      // Under a paragraph line a `<NoTranslate>` stays inline, like any html block.
      if (code !== codes.lessThan || (isFlow && self.interrupt)) return nok(code);
      effects.enter('noTranslate');
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

    // `<NoTranslatex>` is another tag and `<NoTranslate />` has no body: neither is this construct.
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
      if (code === codes.leftCurlyBrace) return regions.braceExpression(code, attributes);
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
        const mayFence = isFlow && atLineStart;
        atLineStart = false;
        return regions.backticks(code, body, mayFence);
      }
      if (isFlow && atLineStart && code === codes.tilde) {
        atLineStart = false;
        return regions.tildes(code, body);
      }

      tagOpensLine = atLineStart;
      atLineStart = false;
      if (code === codes.backslash) {
        consumeData(code);
        return escaped;
      }
      if (code === codes.leftCurlyBrace) return regions.braceExpression(code, body);
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
        effects.enter('noTranslateData');
        dataOpen = true;
      }
      effects.consume(code);
    }

    function exitData(): void {
      if (!dataOpen) return;
      effects.exit('noTranslateData');
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

    // Attributes stay on the opener line. A region in the body runs on, blank lines included.
    function regionLineEnding(code: Code, resume: State): State | undefined {
      if (depth === 0) return nok(code);
      regionResume = resume;
      return lineEnding(code, regionLineStart);
    }

    function regionLineStart(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return lineEnding(code, regionLineStart);
      atLineStart = false;
      return regionResume(code);
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

    // A nested `<NoTranslate>` adds a level, so its closer cant end the outer one.
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
      effects.exit('noTranslate');
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
  };
}

const noTranslateFlow: Construct = {
  name: 'noTranslate',
  tokenize: createTokenize('flow'),
  resolveTo: resolveToNoTranslate,
  concrete: true,
};

const noTranslateText: Construct = {
  name: 'noTranslateText',
  tokenize: createTokenize('text'),
};

/** Micromark extension for the do-not-translate `<NoTranslate>` tag, block (flow) and inline (text). */
export function noTranslate(): Extension {
  return {
    flow: { [codes.lessThan]: [noTranslateFlow] },
    text: { [codes.lessThan]: [noTranslateText] },
  };
}
