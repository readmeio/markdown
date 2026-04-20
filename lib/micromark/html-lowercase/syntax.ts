/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { voidHtmlTags } from 'html-tags';
import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    htmlLowercase: 'htmlLowercase';
    htmlLowercaseData: 'htmlLowercaseData';
  }
}

/**
 * CommonMark html-flow "type 6" block tags. These already have working flow
 * semantics (capture until blank line) that the rest of the pipeline relies
 * on — we defer to CommonMark so behaviors like figure/figcaption reassembly
 * keep working.
 *
 * The value of this tokenizer is in *non-type-6* tags (inline-ish tags like
 * `a`, `span`, `em`, `b`, etc.) where CommonMark's html-text is too strict
 * about unquoted attribute values.
 *
 * @see https://spec.commonmark.org/0.31.2/#html-blocks — type 6 tag list.
 */
const COMMONMARK_TYPE_6_TAGS = new Set([
  'address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body',
  'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
  'hr', 'html', 'iframe', 'legend', 'li', 'link', 'main', 'menu', 'menuitem',
  'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'search',
  'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'title', 'tr', 'track', 'ul',
]);

/**
 * Tags with specialized rawtext/rcdata parsing in html-flow (literal body).
 */
const SPECIALIZED_TAGS = new Set(['script', 'style', 'pre', 'textarea']);

/**
 * HTML5 void elements. These never have a closing tag — treat `>` as tag-end
 * with no body, regardless of whether the author wrote `/>`.
 */
const VOID_ELEMENTS = new Set<string>(voidHtmlTags);

const nonLazyContinuationStart: Construct = {
  tokenize: tokenizeNonLazyContinuationStart,
  partial: true,
};

function resolveToHtmlLowercase(events: Parameters<Resolver>[0]) {
  let index = events.length;

  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'htmlLowercase') {
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

const htmlLowercaseConstruct: Construct = {
  name: 'htmlLowercase',
  tokenize: tokenizeHtmlLowercase,
  resolveTo: resolveToHtmlLowercase,
  concrete: true,
};

const htmlLowercaseTextConstruct: Construct = {
  name: 'htmlLowercaseText',
  tokenize: tokenizeHtmlLowercaseText,
};

function tokenizeHtmlLowercase(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  let tagName = '';
  let depth = 0;
  let closingTagName = '';
  let isVoid = false;

  // Attribute parsing state
  let quoteChar: Code = null;

  return start;

  // ── Start ──────────────────────────────────────────────────────────────

  function start(code: Code): State | undefined {
    if (code !== codes.lessThan) return nok(code);
    effects.enter('htmlLowercase');
    effects.enter('htmlLowercaseData');
    effects.consume(code);
    return tagNameFirst;
  }

  // ── Tag name parsing ───────────────────────────────────────────────────

  function tagNameFirst(code: Code): State | undefined {
    if (code === null || code < codes.lowercaseA || code > codes.lowercaseZ) {
      return nok(code);
    }
    tagName = String.fromCharCode(code);
    effects.consume(code);
    return tagNameRest;
  }

  function tagNameRest(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.dash ||
        code === codes.underscore)
    ) {
      tagName += String.fromCharCode(code);
      effects.consume(code);
      return tagNameRest;
    }

    // Defer tags that already have working CommonMark semantics.
    if (SPECIALIZED_TAGS.has(tagName)) return nok(code);
    if (COMMONMARK_TYPE_6_TAGS.has(tagName)) return nok(code);

    isVoid = VOID_ELEMENTS.has(tagName);
    depth = 1;
    return afterOpenTagName(code);
  }

  // ── Between/after attributes ───────────────────────────────────────────

  function afterOpenTagName(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('htmlLowercaseData');
      return openTagContinuationStart(code);
    }

    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return afterOpenTagName;
    }

    // Self-closing `/>`
    if (code === codes.slash) {
      effects.consume(code);
      return selfCloseGt;
    }

    // End of opening tag
    if (code === codes.greaterThan) {
      effects.consume(code);
      if (isVoid) return afterClose;
      return body;
    }

    // Attribute name must start with [a-zA-Z_:]
    if (isAttrNameStart(code)) {
      effects.consume(code);
      return attrName;
    }

    return nok(code);
  }

  // ── Attribute name ─────────────────────────────────────────────────────

  function attrName(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (isAttrNameChar(code)) {
      effects.consume(code);
      return attrName;
    }

    if (code === codes.equalsTo) {
      effects.consume(code);
      return afterEquals;
    }

    // Boolean attribute (no value) — hand back to the attribute loop.
    if (
      code === codes.space ||
      code === codes.horizontalTab ||
      code === codes.greaterThan ||
      code === codes.slash ||
      markdownLineEnding(code)
    ) {
      return afterOpenTagName(code);
    }

    return nok(code);
  }

  // ── Value start (right after `=`) ──────────────────────────────────────

  function afterEquals(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('htmlLowercaseData');
      return openTagContinuationStart(code);
    }

    // Skip whitespace between `=` and the value
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return afterEquals;
    }

    // Quoted value
    if (code === codes.quotationMark || code === codes.apostrophe) {
      quoteChar = code;
      effects.consume(code);
      return inQuotedAttr;
    }

    // Unquoted value — first char must be a non-terminator.
    // Note: `{` is allowed here. Valid JSX expressions are claimed by the
    // mdxComponent tokenizer first (runs earlier in the extension list); we
    // only reach this branch when mdxComponent failed (e.g. unbalanced `{`),
    // in which case the `{` is a literal char per HTML5 unquoted-value rules.
    if (
      code === codes.equalsTo ||
      code === codes.lessThan ||
      code === codes.greaterThan ||
      code === codes.graveAccent
    ) {
      return nok(code);
    }

    effects.consume(code);
    return unquotedAttrValue;
  }

  // ── Quoted attribute value ─────────────────────────────────────────────

  function inQuotedAttr(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('htmlLowercaseData');
      return openTagContinuationStart(code);
    }

    if (code === quoteChar) {
      effects.consume(code);
      quoteChar = null;
      return afterOpenTagName;
    }

    effects.consume(code);
    return inQuotedAttr;
  }

  // ── Unquoted attribute value ───────────────────────────────────────────

  function unquotedAttrValue(code: Code): State | undefined {
    if (code === null) return nok(code);

    // HTML5 terminators for unquoted values: whitespace, `>`
    if (
      markdownLineEnding(code) ||
      code === codes.space ||
      code === codes.horizontalTab ||
      code === codes.greaterThan
    ) {
      return afterOpenTagName(code);
    }

    // HTML5 disallowed-in-unquoted-value chars
    if (
      code === codes.quotationMark ||
      code === codes.apostrophe ||
      code === codes.equalsTo ||
      code === codes.lessThan ||
      code === codes.graveAccent
    ) {
      return nok(code);
    }

    // Everything else (including `/`, `{`, `}`, `:`, `.`) is a value char.
    effects.consume(code);
    return unquotedAttrValue;
  }

  // ── Self-closing `/>` ──────────────────────────────────────────────────

  function selfCloseGt(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      return afterClose;
    }
    // `/` without `>` — not self-closing; hand back to attribute loop.
    return afterOpenTagName(code);
  }

  // ── Multi-line opening tag continuation ────────────────────────────────

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
    effects.enter('htmlLowercaseData');

    // Resume the correct state after a line ending in the opening tag.
    if (quoteChar !== null) return inQuotedAttr(code);
    return afterOpenTagName(code);
  }

  // ── Body ───────────────────────────────────────────────────────────────

  function body(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (markdownLineEnding(code)) {
      effects.exit('htmlLowercaseData');
      return bodyContinuationStart(code);
    }

    if (code === codes.lessThan) {
      effects.consume(code);
      return bodyLessThan;
    }

    effects.consume(code);
    return body;
  }

  // ── Tag detection inside body ──────────────────────────────────────────

  function bodyLessThan(code: Code): State | undefined {
    if (code === codes.slash) {
      effects.consume(code);
      closingTagName = '';
      return closingTagNameFirst;
    }

    // Potential nested opening tag of the same name (depth counting)
    if (code !== null && code >= codes.lowercaseA && code <= codes.lowercaseZ) {
      closingTagName = String.fromCharCode(code);
      effects.consume(code);
      return nestedOpenTagName;
    }

    return body(code);
  }

  function nestedOpenTagName(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.dash ||
        code === codes.underscore)
    ) {
      closingTagName += String.fromCharCode(code);
      effects.consume(code);
      return nestedOpenTagName;
    }

    if (
      closingTagName === tagName &&
      !VOID_ELEMENTS.has(closingTagName) &&
      (code === codes.greaterThan ||
        code === codes.slash ||
        code === codes.space ||
        code === codes.horizontalTab)
    ) {
      depth += 1;
    }

    return body(code);
  }

  function closingTagNameFirst(code: Code): State | undefined {
    if (code !== null && code >= codes.lowercaseA && code <= codes.lowercaseZ) {
      closingTagName = String.fromCharCode(code);
      effects.consume(code);
      return closingTagNameRest;
    }
    return body(code);
  }

  function closingTagNameRest(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.dash ||
        code === codes.underscore)
    ) {
      closingTagName += String.fromCharCode(code);
      effects.consume(code);
      return closingTagNameRest;
    }

    if (closingTagName === tagName && code === codes.greaterThan) {
      depth -= 1;
      effects.consume(code);
      if (depth === 0) return afterClose;
      return body;
    }

    return body(code);
  }

  // ── After closing tag / self-close ─────────────────────────────────────

  function afterClose(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('htmlLowercaseData');
      effects.exit('htmlLowercase');
      return ok(code);
    }
    // Only trailing whitespace is allowed on the close-tag line. Non-whitespace
    // content after `</tag>` means this is inline HTML inside a paragraph —
    // bail so CommonMark's paragraph + html-text handle it.
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return afterClose;
    }
    return nok(code);
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
    effects.enter('htmlLowercaseData');
    return body(code);
  }

  // ── Shared lazy continuation failure ───────────────────────────────────

  function continuationAfter(code: Code): State | undefined {
    if (code === null) return nok(code);
    effects.exit('htmlLowercase');
    return ok(code);
  }
}

/**
 * Inline (text-context) variant of the tokenizer.
 *
 * Differences from the flow variant:
 * - No line continuation — a line ending anywhere inside the tag, quoted
 *   attribute value, or body is `nok`. Inline HTML stays on one line.
 * - `afterClose` returns `ok` immediately without consuming trailing chars,
 *   so the surrounding paragraph picks up where the tag ended.
 * - No type-6 tag exclusion (those aren't legal phrasing content anyway, but
 *   we keep it narrow by not claiming them here either, to match the flow
 *   variant's deference).
 */
function tokenizeHtmlLowercaseText(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  let tagName = '';
  let depth = 0;
  let closingTagName = '';
  let isVoid = false;
  let quoteChar: Code = null;

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.lessThan) return nok(code);
    effects.enter('htmlLowercase');
    effects.enter('htmlLowercaseData');
    effects.consume(code);
    return tagNameFirst;
  }

  function tagNameFirst(code: Code): State | undefined {
    if (code === null || code < codes.lowercaseA || code > codes.lowercaseZ) {
      return nok(code);
    }
    tagName = String.fromCharCode(code);
    effects.consume(code);
    return tagNameRest;
  }

  function tagNameRest(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.dash ||
        code === codes.underscore)
    ) {
      tagName += String.fromCharCode(code);
      effects.consume(code);
      return tagNameRest;
    }

    if (SPECIALIZED_TAGS.has(tagName)) return nok(code);
    if (COMMONMARK_TYPE_6_TAGS.has(tagName)) return nok(code);

    isVoid = VOID_ELEMENTS.has(tagName);
    depth = 1;
    return afterOpenTagName(code);
  }

  function afterOpenTagName(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);

    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return afterOpenTagName;
    }

    if (code === codes.slash) {
      effects.consume(code);
      return selfCloseGt;
    }

    if (code === codes.greaterThan) {
      effects.consume(code);
      if (isVoid) return afterClose;
      return body;
    }

    if (isAttrNameStart(code)) {
      effects.consume(code);
      return attrName;
    }

    return nok(code);
  }

  function attrName(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);

    if (isAttrNameChar(code)) {
      effects.consume(code);
      return attrName;
    }

    if (code === codes.equalsTo) {
      effects.consume(code);
      return afterEquals;
    }

    if (
      code === codes.space ||
      code === codes.horizontalTab ||
      code === codes.greaterThan ||
      code === codes.slash
    ) {
      return afterOpenTagName(code);
    }

    return nok(code);
  }

  function afterEquals(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);

    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return afterEquals;
    }

    if (code === codes.quotationMark || code === codes.apostrophe) {
      quoteChar = code;
      effects.consume(code);
      return inQuotedAttr;
    }

    // `{` is allowed. Valid JSX expressions are claimed by mdxComponent first;
    // we only reach this branch when mdxComponent failed (e.g. unbalanced `{`),
    // where `{` is a literal unquoted-value char per HTML5.
    if (
      code === codes.equalsTo ||
      code === codes.lessThan ||
      code === codes.greaterThan ||
      code === codes.graveAccent
    ) {
      return nok(code);
    }

    effects.consume(code);
    return unquotedAttrValue;
  }

  function inQuotedAttr(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);

    if (code === quoteChar) {
      effects.consume(code);
      quoteChar = null;
      return afterOpenTagName;
    }

    effects.consume(code);
    return inQuotedAttr;
  }

  function unquotedAttrValue(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);

    if (
      code === codes.space ||
      code === codes.horizontalTab ||
      code === codes.greaterThan
    ) {
      return afterOpenTagName(code);
    }

    if (
      code === codes.quotationMark ||
      code === codes.apostrophe ||
      code === codes.equalsTo ||
      code === codes.lessThan ||
      code === codes.graveAccent
    ) {
      return nok(code);
    }

    effects.consume(code);
    return unquotedAttrValue;
  }

  function selfCloseGt(code: Code): State | undefined {
    if (code === codes.greaterThan) {
      effects.consume(code);
      return afterClose;
    }
    return afterOpenTagName(code);
  }

  function body(code: Code): State | undefined {
    // Inline HTML doesn't span lines.
    if (code === null || markdownLineEnding(code)) return nok(code);

    if (code === codes.lessThan) {
      effects.consume(code);
      return bodyLessThan;
    }

    effects.consume(code);
    return body;
  }

  function bodyLessThan(code: Code): State | undefined {
    if (code === codes.slash) {
      effects.consume(code);
      closingTagName = '';
      return closingTagNameFirst;
    }

    if (code !== null && code >= codes.lowercaseA && code <= codes.lowercaseZ) {
      closingTagName = String.fromCharCode(code);
      effects.consume(code);
      return nestedOpenTagName;
    }

    return body(code);
  }

  function nestedOpenTagName(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.dash ||
        code === codes.underscore)
    ) {
      closingTagName += String.fromCharCode(code);
      effects.consume(code);
      return nestedOpenTagName;
    }

    if (
      closingTagName === tagName &&
      !VOID_ELEMENTS.has(closingTagName) &&
      (code === codes.greaterThan ||
        code === codes.slash ||
        code === codes.space ||
        code === codes.horizontalTab)
    ) {
      depth += 1;
    }

    return body(code);
  }

  function closingTagNameFirst(code: Code): State | undefined {
    if (code !== null && code >= codes.lowercaseA && code <= codes.lowercaseZ) {
      closingTagName = String.fromCharCode(code);
      effects.consume(code);
      return closingTagNameRest;
    }
    return body(code);
  }

  function closingTagNameRest(code: Code): State | undefined {
    if (
      code !== null &&
      ((code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
        (code >= codes.digit0 && code <= codes.digit9) ||
        code === codes.dash ||
        code === codes.underscore)
    ) {
      closingTagName += String.fromCharCode(code);
      effects.consume(code);
      return closingTagNameRest;
    }

    if (closingTagName === tagName && code === codes.greaterThan) {
      depth -= 1;
      effects.consume(code);
      if (depth === 0) return afterClose;
      return body;
    }

    return body(code);
  }

  // Inline: exit immediately, leave trailing chars to the surrounding
  // paragraph's text parser.
  function afterClose(code: Code): State | undefined {
    effects.exit('htmlLowercaseData');
    effects.exit('htmlLowercase');
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
    if (self.parser.lazy[self.now().line]) return nok(code);
    return ok(code);
  }
}

// ── Character helpers ────────────────────────────────────────────────────

function isAttrNameStart(code: number): boolean {
  return (
    (code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
    (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
    code === codes.underscore ||
    code === codes.colon
  );
}

function isAttrNameChar(code: number): boolean {
  return (
    isAttrNameStart(code) ||
    (code >= codes.digit0 && code <= codes.digit9) ||
    code === codes.dash ||
    code === codes.dot
  );
}

/**
 * Micromark extension that tokenizes lowercase HTML tags as single flow
 * blocks, tolerating unquoted attribute values with characters that
 * micromark-core-commonmark's html-flow rejects (notably `/`).
 *
 * Emits an `html` mdast node containing the raw tag source — rehype-raw
 * then parses it via parse5, which is spec-compliant for HTML5.
 *
 * Bails (`nok`) when:
 * - The tag name is specialized (script, style, pre, textarea, title) —
 *   CommonMark's html-flow handles those with correct rawtext semantics.
 * - An attribute value starts with `{` — this is a JSX attribute expression
 *   and should be claimed by the `mdxComponent` tokenizer instead.
 *
 * Void elements (br, img, hr, etc.) are recognized as self-terminating
 * without requiring a matching closing tag.
 */
export function htmlLowercase(): Extension {
  return {
    flow: {
      [codes.lessThan]: [htmlLowercaseConstruct],
    },
    text: {
      [codes.lessThan]: [htmlLowercaseTextConstruct],
    },
  };
}
