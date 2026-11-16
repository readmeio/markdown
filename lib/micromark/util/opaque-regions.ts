/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, State } from 'micromark-util-types';

import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

export interface OpaqueRegionHost {
  /** Puts one code into the open data token. */
  consume(code: Code): void;
  effects: Effects;
  /** Takes a line ending inside a region, then comes back to `resume` with the next line's first code. */
  lineEnding(code: Code, resume: State): State | undefined;
  nok: State;
}

// Code spans, fences and `{…}` expressions inside a tag. A `<` or `>` in one is not a tag,
// so a tokenizer walks them here and gets its own state back once they close.
export function createOpaqueRegions({ effects, nok, consume, lineEnding }: OpaqueRegionHost) {
  // Where the open region hands back.
  let after: State = nok;

  let quoteChar: Code = null;
  let braceDepth = 0;
  let inTemplateLiteral = false;
  // braceDepth at each `${`, so its `}` returns to the template literal.
  const templateStack: number[] = [];

  let fenceEligible = false;
  let codeSpanOpenSize = 0;
  let codeSpanCloseSize = 0;
  let fenceChar: Code = null;
  let fenceLength = 0;
  let runLength = 0;
  // A backtick run needs a partner before a blank line or the end, else it is literal text.
  const codeSpanCloses: Construct = { tokenize: tokenizeCodeSpanCloses, partial: true };

  /** Entry at a `{`. Hands back to `next` once the matching `}` is consumed. */
  function braceExpression(code: Code, next: State): State | undefined {
    after = next;
    braceDepth = 1;
    inTemplateLiteral = false;
    consume(code);
    return inBraceExpression;
  }

  /** Entry at a backtick. Three or more open a fence when `mayFence`, else a code span. */
  function backticks(code: Code, next: State, mayFence: boolean): State | undefined {
    after = next;
    fenceEligible = mayFence;
    codeSpanOpenSize = 0;
    return countOpenTicks(code);
  }

  /** Entry at a tilde at line start. Fewer than three hand straight back to `next`. */
  function tildes(code: Code, next: State): State | undefined {
    after = next;
    runLength = 0;
    return countTildes(code);
  }

  // ── `{…}` expressions ─────────────────────────────────────────────────────

  function inBraceExpression(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) return lineEnding(code, braceResume);
    if (code === codes.quotationMark || code === codes.apostrophe) {
      quoteChar = code;
      consume(code);
      return braceString;
    }
    if (code === codes.graveAccent) {
      inTemplateLiteral = true;
      consume(code);
      return braceTemplateLiteral;
    }
    if (code === codes.leftCurlyBrace) braceDepth += 1;
    if (code === codes.rightCurlyBrace) braceDepth -= 1;
    consume(code);
    if (templateStack.length && braceDepth === templateStack[templateStack.length - 1]) {
      templateStack.pop();
      inTemplateLiteral = true;
      return braceTemplateLiteral;
    }
    return braceDepth === 0 ? after : inBraceExpression;
  }

  // Picks up the state a line ending interrupted.
  function braceResume(code: Code): State | undefined {
    if (quoteChar !== null) return braceString(code);
    return inTemplateLiteral ? braceTemplateLiteral(code) : inBraceExpression(code);
  }

  function braceString(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) return lineEnding(code, braceResume);
    if (code === codes.backslash) {
      consume(code);
      return braceStringEscape;
    }
    consume(code);
    if (code !== quoteChar) return braceString;
    quoteChar = null;
    return inBraceExpression;
  }

  function braceStringEscape(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return braceString(code);
    consume(code);
    return braceString;
  }

  function braceTemplateLiteral(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) return lineEnding(code, braceResume);
    if (code === codes.graveAccent) {
      inTemplateLiteral = false;
      consume(code);
      return inBraceExpression;
    }
    if (code === codes.backslash) {
      consume(code);
      return braceTemplateLiteralEscape;
    }
    if (code === codes.dollarSign) {
      consume(code);
      return braceTemplateLiteralDollar;
    }
    consume(code);
    return braceTemplateLiteral;
  }

  function braceTemplateLiteralEscape(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return braceTemplateLiteral(code);
    consume(code);
    return braceTemplateLiteral;
  }

  function braceTemplateLiteralDollar(code: Code): State | undefined {
    if (code !== codes.leftCurlyBrace) return braceTemplateLiteral(code);
    templateStack.push(braceDepth);
    braceDepth += 1;
    inTemplateLiteral = false;
    consume(code);
    return inBraceExpression;
  }

  // ── Code spans ────────────────────────────────────────────────────────────

  function countOpenTicks(code: Code): State | undefined {
    if (code === codes.graveAccent) {
      codeSpanOpenSize += 1;
      consume(code);
      return countOpenTicks;
    }
    if (fenceEligible && codeSpanOpenSize >= 3) {
      fenceChar = codes.graveAccent;
      fenceLength = codeSpanOpenSize;
      return inFencedCode(code);
    }
    // A run with no partner is literal, as in CommonMark, so the host keeps looking for its closer.
    return effects.check(codeSpanCloses, inCodeSpan, after)(code);
  }

  // Looks ahead for a run of the same size, consuming nothing.
  function tokenizeCodeSpanCloses(fx: Effects, closes: State, stays: State): State {
    let run = 0;

    function scan(code: Code): State | undefined {
      if (code === null) return stays(code);
      if (markdownLineEnding(code)) {
        fx.consume(code);
        return afterLineEnding;
      }
      if (code === codes.graveAccent) {
        run = 0;
        return ticks(code);
      }
      fx.consume(code);
      return scan;
    }

    function afterLineEnding(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return stays(code);
      if (markdownSpace(code)) {
        fx.consume(code);
        return afterLineEnding;
      }
      return scan(code);
    }

    function ticks(code: Code): State | undefined {
      if (code === codes.graveAccent) {
        run += 1;
        fx.consume(code);
        return ticks;
      }
      return run === codeSpanOpenSize ? closes(code) : scan(code);
    }

    return scan;
  }

  // A code span crosses a soft break. The lookahead already ruled out a blank line before the partner.
  function inCodeSpan(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) return lineEnding(code, inCodeSpan);
    if (code === codes.graveAccent) {
      codeSpanCloseSize = 0;
      return countCloseTicks(code);
    }
    consume(code);
    return inCodeSpan;
  }

  function countCloseTicks(code: Code): State | undefined {
    if (code === codes.graveAccent) {
      codeSpanCloseSize += 1;
      consume(code);
      return countCloseTicks;
    }
    return codeSpanCloseSize === codeSpanOpenSize ? after(code) : inCodeSpan(code);
  }

  // ── Fences ────────────────────────────────────────────────────────────────

  function countTildes(code: Code): State | undefined {
    if (code === codes.tilde) {
      runLength += 1;
      consume(code);
      return countTildes;
    }
    if (runLength < 3) return after(code);
    fenceChar = codes.tilde;
    fenceLength = runLength;
    return inFencedCode(code);
  }

  function inFencedCode(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (markdownLineEnding(code)) return lineEnding(code, fenceCloseIndent);
    consume(code);
    return inFencedCode;
  }

  // An indented fence closes on an equally indented line, so skip the indent first.
  function fenceCloseIndent(code: Code): State | undefined {
    if (markdownSpace(code)) {
      consume(code);
      return fenceCloseIndent;
    }
    runLength = 0;
    return fenceCloseRun(code);
  }

  function fenceCloseRun(code: Code): State | undefined {
    if (code === fenceChar) {
      runLength += 1;
      consume(code);
      return fenceCloseRun;
    }
    return runLength < fenceLength ? inFencedCode(code) : fenceCloseTrailing(code);
  }

  // The host takes the line ending after the closing fence, so it lands at its own line start.
  function fenceCloseTrailing(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      fenceChar = null;
      return after(code);
    }
    if (markdownSpace(code)) {
      consume(code);
      return fenceCloseTrailing;
    }
    return inFencedCode(code);
  }

  return { braceExpression, backticks, tildes };
}
