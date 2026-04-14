/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    mdxComponent: 'mdxComponent';
    mdxComponentData: 'mdxComponentData';
  }
}

/**
 * Tags that have dedicated tokenizers or transformers and should NOT be
 * captured by this generic MDX component tokenizer.
 */
const EXCLUDED_TAGS = new Set(['Table', 'HTMLBlock', 'Glossary', 'Anchor']);

const nonLazyContinuationStart: Construct = {
  tokenize: tokenizeNonLazyContinuationStart,
  partial: true,
};

function resolveToMdxComponent(events: Parameters<Resolver>[0]) {
  let index = events.length;

  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'mdxComponent') {
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

const mdxComponentConstruct: Construct = {
  name: 'mdxComponent',
  tokenize: tokenizeMdxComponent,
  resolveTo: resolveToMdxComponent,
  concrete: true,
};

function tokenizeMdxComponent(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  let tagName = '';
  let depth = 0;
  let closingTagName = '';

  // Code span tracking
  let codeSpanOpenSize = 0;
  let codeSpanCloseSize = 0;

  // Fenced code block tracking
  let fenceChar: Code = null;
  let fenceLength = 0;
  let fenceCloseLength = 0;
  let atLineStart = false;

  // Attribute parsing state
  let quoteChar: Code = null;
  let braceDepth = 0;
  let inTemplateLit = false; // true when inside a template literal (for line continuation)
  // Stack of braceDepth values at each ${...} interpolation entry point.
  // When a } brings braceDepth back to a saved value, we return to the
  // template literal instead of continuing in the brace expression.
  const templateStack: number[] = [];

  return start;

  // ── Start ──────────────────────────────────────────────────────────────

  function start(code: Code): State | undefined {
    if (code !== codes.lessThan) return nok(code);
    effects.enter('mdxComponent');
    effects.enter('mdxComponentData');
    effects.consume(code);
    return tagNameFirst;
  }

  // ── Tag name parsing ───────────────────────────────────────────────────

  function tagNameFirst(code: Code): State | undefined {
    // Must start with uppercase A-Z
    if (code === null || code < codes.uppercaseA || code > codes.uppercaseZ) {
      return nok(code);
    }
    tagName = String.fromCharCode(code);
    effects.consume(code);
    return tagNameRest;
  }

  function tagNameRest(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
        (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.underscore)
    ) {
      tagName += String.fromCharCode(code);
      effects.consume(code);
      return tagNameRest;
    }

    // Tag name complete — check exclusions
    if (EXCLUDED_TAGS.has(tagName)) {
      return nok(code);
    }

    depth = 1;
    return afterOpenTagName(code);
  }

  // ── Opening tag attributes ─────────────────────────────────────────────

  function afterOpenTagName(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      return openTagContinuationStart(code);
    }

    // Self-closing />
    if (code === codes.slash) {
      effects.consume(code);
      return selfCloseGt;
    }

    // End of opening tag
    if (code === codes.greaterThan) {
      effects.consume(code);
      return body;
    }

    // Quoted attribute value
    if (code === codes.quotationMark || code === codes.apostrophe) {
      quoteChar = code;
      effects.consume(code);
      return inQuotedAttr;
    }

    // JSX expression attribute
    if (code === codes.leftCurlyBrace) {
      braceDepth = 1;
      effects.consume(code);
      return inBraceExpr;
    }

    effects.consume(code);
    return afterOpenTagName;
  }

  function inQuotedAttr(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      return openTagContinuationStart(code);
    }

    if (code === codes.backslash) {
      effects.consume(code);
      return inQuotedAttrEscape;
    }

    if (code === quoteChar) {
      effects.consume(code);
      quoteChar = null;
      return afterOpenTagName;
    }

    effects.consume(code);
    return inQuotedAttr;
  }

  function inQuotedAttrEscape(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return inQuotedAttr(code);
    }
    effects.consume(code);
    return inQuotedAttr;
  }

  function inBraceExpr(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      return openTagContinuationStart(code);
    }

    // Handle strings inside braces
    if (code === codes.quotationMark || code === codes.apostrophe) {
      quoteChar = code;
      effects.consume(code);
      return inBraceString;
    }

    // Handle template literals inside braces
    if (code === codes.graveAccent) {
      inTemplateLit = true;
      effects.consume(code);
      return inBraceTemplateLiteral;
    }

    if (code === codes.leftCurlyBrace) {
      braceDepth += 1;
      effects.consume(code);
      return inBraceExpr;
    }

    if (code === codes.rightCurlyBrace) {
      braceDepth -= 1;
      effects.consume(code);

      // Check if this } closes a ${...} interpolation
      if (templateStack.length > 0 && braceDepth === templateStack[templateStack.length - 1]) {
        templateStack.pop();
        inTemplateLit = true; // back inside the template literal
        return inBraceTemplateLiteral;
      }

      if (braceDepth === 0) {
        return afterOpenTagName;
      }
      return inBraceExpr;
    }

    effects.consume(code);
    return inBraceExpr;
  }

  function inBraceString(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      return openTagContinuationStart(code);
    }

    if (code === codes.backslash) {
      effects.consume(code);
      return inBraceStringEscape;
    }

    if (code === quoteChar) {
      effects.consume(code);
      quoteChar = null;
      return inBraceExpr;
    }

    effects.consume(code);
    return inBraceString;
  }

  function inBraceStringEscape(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return inBraceString(code);
    }
    effects.consume(code);
    return inBraceString;
  }

  // ── Template literal handling inside brace expressions ─────────────────

  function inBraceTemplateLiteral(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      return openTagContinuationStart(code);
    }

    // Closing backtick ends the template literal
    if (code === codes.graveAccent) {
      inTemplateLit = false;
      effects.consume(code);
      return inBraceExpr;
    }

    // Backslash escape (e.g., \` or \$)
    if (code === codes.backslash) {
      effects.consume(code);
      return inBraceTemplateLiteralEscape;
    }

    // ${ starts an interpolation
    if (code === codes.dollarSign) {
      effects.consume(code);
      return inBraceTemplateLiteralDollar;
    }

    effects.consume(code);
    return inBraceTemplateLiteral;
  }

  function inBraceTemplateLiteralEscape(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return inBraceTemplateLiteral(code);
    }
    effects.consume(code);
    return inBraceTemplateLiteral;
  }

  function inBraceTemplateLiteralDollar(code: Code): State | undefined {
    if (code === codes.leftCurlyBrace) {
      // Enter ${...} interpolation. Save current braceDepth so we know
      // when the matching } returns us to this template literal.
      templateStack.push(braceDepth);
      braceDepth += 1;
      inTemplateLit = false; // now inside interpolation expression
      effects.consume(code);
      return inBraceExpr;
    }
    // Just a $ not followed by { — back to template literal
    return inBraceTemplateLiteral(code);
  }

  function selfCloseGt(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      // Self-closing tag completes the token
      return afterClose;
    }
    // `/ ` without `>` is just part of the attribute area
    return afterOpenTagName(code);
  }

  // Continuation for multi-line opening tags
  function openTagContinuationStart(code: Code): State | undefined {
    return effects.check(nonLazyContinuationStart, openTagContinuationNonLazy, continuationAfter)(code);
  }

  function openTagContinuationNonLazy(code: Code): State | undefined {
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return openTagContinuationBefore;
  }

  function openTagContinuationBefore(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return openTagContinuationStart(code);
    }
    effects.enter('mdxComponentData');

    // Resume the correct state after a line ending in the opening tag.
    if (inTemplateLit) return inBraceTemplateLiteral(code);
    if (braceDepth > 0) {
      if (quoteChar !== null) return inBraceString(code);
      return inBraceExpr(code);
    }
    if (quoteChar !== null) return inQuotedAttr(code);
    return afterOpenTagName(code);
  }

  // ── Body ───────────────────────────────────────────────────────────────

  function body(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      atLineStart = true;
      return bodyContinuationStart(code);
    }

    if (code === codes.backslash) {
      effects.consume(code);
      return bodyEscapedChar;
    }

    if (code === codes.lessThan) {
      effects.consume(code);
      return bodyLessThan;
    }

    // Code span tracking
    if (code === codes.graveAccent) {
      codeSpanOpenSize = 0;
      return countOpenTicks(code);
    }

    effects.consume(code);
    atLineStart = false;
    return body;
  }

  function bodyEscapedChar(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return body(code);
    }
    effects.consume(code);
    return body;
  }

  // ── Code span handling ─────────────────────────────────────────────────

  function countOpenTicks(code: Code): State | undefined {
    if (code === codes.graveAccent) {
      codeSpanOpenSize += 1;
      effects.consume(code);
      return countOpenTicks;
    }

    // 3+ backticks at line start = fenced code block
    if (atLineStart && codeSpanOpenSize >= 3) {
      fenceChar = codes.graveAccent;
      fenceLength = codeSpanOpenSize;
      return inFencedCode(code);
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

  // ── Fenced code block handling ─────────────────────────────────────────

  function inFencedCode(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      return fencedCodeContinuationStart(code);
    }

    effects.consume(code);
    return inFencedCode;
  }

  function fencedCodeContinuationStart(code: Code): State | undefined {
    return effects.check(nonLazyContinuationStart, fencedCodeContinuationNonLazy, continuationAfter)(code);
  }

  function fencedCodeContinuationNonLazy(code: Code): State | undefined {
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return fencedCodeContinuationBefore;
  }

  function fencedCodeContinuationBefore(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return fencedCodeContinuationStart(code);
    }
    effects.enter('mdxComponentData');
    fenceCloseLength = 0;

    // Check for closing fence
    if (code === fenceChar) {
      fenceCloseLength = 1;
      effects.consume(code);
      return fenceCloseCheck;
    }

    return inFencedCode(code);
  }

  function fenceCloseCheck(code: Code): State | undefined {
    if (code === fenceChar) {
      fenceCloseLength += 1;
      effects.consume(code);
      return fenceCloseCheck;
    }

    if (fenceCloseLength >= fenceLength) {
      // Valid closing fence — consume rest of line and return to body
      fenceChar = null;
      fenceLength = 0;
      return fenceCloseTrailing(code);
    }

    // Not enough fence chars, still in code
    return inFencedCode(code);
  }

  function fenceCloseTrailing(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      atLineStart = true;
      return body(code);
    }

    // Only spaces/tabs allowed after closing fence
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return fenceCloseTrailing;
    }

    // Non-whitespace after fence chars — not actually a closing fence
    return inFencedCode(code);
  }

  // ── Tilde fenced code detection ────────────────────────────────────────

  function bodyAfterLineStart(code: Code): State | undefined {
    if (code === codes.tilde) {
      fenceCloseLength = 1;
      effects.consume(code);
      return countTildes;
    }
    atLineStart = false;
    return body(code);
  }

  function countTildes(code: Code): State | undefined {
    if (code === codes.tilde) {
      fenceCloseLength += 1;
      effects.consume(code);
      return countTildes;
    }

    if (fenceCloseLength >= 3) {
      fenceChar = codes.tilde;
      fenceLength = fenceCloseLength;
      return inFencedCode(code);
    }

    // Less than 3 tildes, not a fence
    atLineStart = false;
    return body(code);
  }

  // ── Tag detection inside body ──────────────────────────────────────────

  function bodyLessThan(code: Code): State | undefined {
    if (code === codes.slash) {
      effects.consume(code);
      closingTagName = '';
      return closingTagNameFirst;
    }

    // Potential nested opening tag
    if (code !== null && code >= codes.uppercaseA && code <= codes.uppercaseZ) {
      closingTagName = String.fromCharCode(code);
      effects.consume(code);
      return nestedOpenTagName;
    }

    atLineStart = false;
    return body(code);
  }

  // ── Nested opening tag ─────────────────────────────────────────────────

  function nestedOpenTagName(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
        (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.underscore)
    ) {
      closingTagName += String.fromCharCode(code);
      effects.consume(code);
      return nestedOpenTagName;
    }

    // Only increment depth for same-name tags that are followed by valid tag-end chars
    if (closingTagName === tagName && (code === codes.greaterThan || code === codes.slash || code === codes.space || code === codes.horizontalTab)) {
      depth += 1;
    }

    atLineStart = false;
    return body(code);
  }

  // ── Closing tag ────────────────────────────────────────────────────────

  function closingTagNameFirst(code: Code): State | undefined {
    if (code !== null && code >= codes.uppercaseA && code <= codes.uppercaseZ) {
      closingTagName = String.fromCharCode(code);
      effects.consume(code);
      return closingTagNameRest;
    }
    atLineStart = false;
    return body(code);
  }

  function closingTagNameRest(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
        (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.underscore)
    ) {
      closingTagName += String.fromCharCode(code);
      effects.consume(code);
      return closingTagNameRest;
    }

    if (closingTagName === tagName && code === codes.greaterThan) {
      depth -= 1;
      effects.consume(code);
      if (depth === 0) {
        return afterClose;
      }
      return body;
    }

    atLineStart = false;
    return body(code);
  }

  // ── After closing tag ──────────────────────────────────────────────────

  function afterClose(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('mdxComponentData');
      effects.exit('mdxComponent');
      return ok(code);
    }
    // Note: This correctly won't consume text after the closing tag
    // E.g. <Test />text text won't be consumed to inside the component
    effects.consume(code);
    return afterClose;
  }

  // ── Body continuation (line endings) ───────────────────────────────────

  function bodyContinuationStart(code: Code): State | undefined {
    return effects.check(nonLazyContinuationStart, bodyContinuationNonLazy, continuationAfter)(code);
  }

  function bodyContinuationNonLazy(code: Code): State | undefined {
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return bodyContinuationBefore;
  }

  function bodyContinuationBefore(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return bodyContinuationStart(code);
    }
    effects.enter('mdxComponentData');

    // Detect tilde fences at line start
    if (atLineStart && code === codes.tilde) {
      return bodyAfterLineStart(code);
    }

    // Detect backtick fences at line start
    if (atLineStart && code === codes.graveAccent) {
      codeSpanOpenSize = 0;
      atLineStart = false;
      return countOpenTicks(code);
    }

    atLineStart = false;
    return body(code);
  }

  // ── Shared lazy continuation failure ───────────────────────────────────

  function continuationAfter(code: Code): State | undefined {
    if (code === null) {
      return nok(code);
    }
    effects.exit('mdxComponent');
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
 * Micromark extension that tokenizes PascalCase MDX components as single
 * flow blocks.
 *
 * Captures `<Component ...>...</Component>` (including self-closing
 * `<Component />`) in their entirety, preventing CommonMark from
 * fragmenting them across multiple HTML / paragraph nodes.
 *
 * Excludes tags handled by dedicated tokenizers: Table, HTMLBlock,
 * Glossary, Anchor.
 */
export function mdxComponent(): Extension {
  return {
    flow: {
      [codes.lessThan]: [mdxComponentConstruct],
    },
  };
}
