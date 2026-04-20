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

/** Tags with specialized rawtext/rcdata parsing — defer to CommonMark. */
const SPECIALIZED_TAGS = new Set(['script', 'style', 'pre', 'textarea']);

/** HTML5 void elements — no matching close tag required. */
const VOID_ELEMENTS = new Set<string>(voidHtmlTags);

// ── Character class helpers ──────────────────────────────────────────────

const isLower = (c: Code): c is number =>
  c !== null && c >= codes.lowercaseA && c <= codes.lowercaseZ;

const isTagNameChar = (c: Code): c is number =>
  isLower(c) ||
  (c !== null && c >= codes.digit0 && c <= codes.digit9) ||
  c === codes.dash ||
  c === codes.underscore;

const isAttrNameStart = (c: Code): c is number =>
  (c !== null && c >= codes.uppercaseA && c <= codes.uppercaseZ) ||
  isLower(c) ||
  c === codes.underscore ||
  c === codes.colon;

const isAttrNameChar = (c: Code): c is number =>
  isAttrNameStart(c) ||
  (c !== null && c >= codes.digit0 && c <= codes.digit9) ||
  c === codes.dash ||
  c === codes.dot;

const isInlineSpace = (c: Code) => c === codes.space || c === codes.horizontalTab;

/** HTML5 terminators for unquoted attribute values (other than whitespace/`>`). */
const isUnquotedValueDisallowed = (c: Code) =>
  c === codes.quotationMark ||
  c === codes.apostrophe ||
  c === codes.equalsTo ||
  c === codes.lessThan ||
  c === codes.graveAccent;

// ── Non-lazy line continuation (flow only) ───────────────────────────────

function tokenizeNonLazyContinuationStart(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self = this;
  return (code: Code) => {
    if (!markdownLineEnding(code)) return nok(code);
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return (c: Code) => (self.parser.lazy[self.now().line] ? nok(c) : ok(c));
  };
}

const nonLazyContinuationStart: Construct = {
  tokenize: tokenizeNonLazyContinuationStart,
  partial: true,
};

// ── resolveTo: strip linePrefix (flow only) ──────────────────────────────

const resolveToHtmlLowercase: Resolver = events => {
  let index = events.length;
  while (index > 0) {
    index -= 1;
    if (events[index][0] === 'enter' && events[index][1].type === 'htmlLowercase') break;
  }
  if (index > 1 && events[index - 2][1].type === types.linePrefix) {
    events[index][1].start = events[index - 2][1].start;
    events[index + 1][1].start = events[index - 2][1].start;
    events.splice(index - 2, 2);
  }
  return events;
};

// ── Shared tokenizer factory ─────────────────────────────────────────────

/**
 * Factory for both flow and text variants. The only behavioral differences:
 * - **Line endings**: in flow mode they trigger a continuation check so the
 *   tag can span multiple lines; in text mode any line ending returns `nok`
 *   because inline constructs don't span lines.
 * - **Trailing content after `</tag>`**: flow mode only allows whitespace
 *   through end-of-line (otherwise `nok`, so CommonMark's paragraph + inline
 *   handling takes over); text mode exits immediately and lets the paragraph
 *   pick up after the close tag.
 */
function createTokenize(mode: 'flow' | 'text') {
  const isFlow = mode === 'flow';

  return function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
    let tagName = '';
    let depth = 0;
    let closingTagName = '';
    let isVoid = false;
    let quoteChar: Code = null;

    // In flow mode, line endings inside the open tag transition to the
    // continuation check. In text mode, they abort.
    const openTagLineEnd = (code: Code): State | undefined => {
      if (!isFlow) return nok(code);
      effects.exit('htmlLowercaseData');
      return openTagContinuationStart(code);
    };

    return start;

    // ── Start ─────────────────────────────────────────────────────────────

    function start(code: Code): State | undefined {
      if (code !== codes.lessThan) return nok(code);
      effects.enter('htmlLowercase');
      effects.enter('htmlLowercaseData');
      effects.consume(code);
      return tagNameFirst;
    }

    function tagNameFirst(code: Code): State | undefined {
      if (!isLower(code)) return nok(code);
      tagName = String.fromCharCode(code);
      effects.consume(code);
      return tagNameRest;
    }

    function tagNameRest(code: Code): State | undefined {
      if (isTagNameChar(code)) {
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

    // ── Between/after attributes ──────────────────────────────────────────

    function afterOpenTagName(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return openTagLineEnd(code);

      if (isInlineSpace(code)) {
        effects.consume(code);
        return afterOpenTagName;
      }
      if (code === codes.slash) {
        effects.consume(code);
        return selfCloseGt;
      }
      if (code === codes.greaterThan) {
        effects.consume(code);
        return isVoid ? afterClose : body;
      }
      if (isAttrNameStart(code)) {
        effects.consume(code);
        return attrName;
      }
      return nok(code);
    }

    // ── Attribute name ────────────────────────────────────────────────────

    function attrName(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return openTagLineEnd(code);

      if (isAttrNameChar(code)) {
        effects.consume(code);
        return attrName;
      }
      if (code === codes.equalsTo) {
        effects.consume(code);
        return afterEquals;
      }
      // Boolean attribute or tag-terminator — hand back to the attribute loop.
      if (isInlineSpace(code) || code === codes.greaterThan || code === codes.slash) {
        return afterOpenTagName(code);
      }
      return nok(code);
    }

    // ── Value start (right after `=`) ─────────────────────────────────────
    //
    // `{` is allowed here. Valid JSX expressions are claimed by the
    // `mdxComponent` tokenizer first (runs earlier in the extension list);
    // we only reach this branch when `mdxComponent` failed (e.g. unbalanced
    // `{`), in which case `{` is a literal char per HTML5 unquoted-value
    // rules.

    function afterEquals(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return openTagLineEnd(code);

      if (isInlineSpace(code)) {
        effects.consume(code);
        return afterEquals;
      }
      if (code === codes.quotationMark || code === codes.apostrophe) {
        quoteChar = code;
        effects.consume(code);
        return inQuotedAttr;
      }
      if (code === codes.greaterThan || isUnquotedValueDisallowed(code)) {
        return nok(code);
      }
      effects.consume(code);
      return unquotedAttrValue;
    }

    function inQuotedAttr(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) return openTagLineEnd(code);

      if (code === quoteChar) {
        effects.consume(code);
        quoteChar = null;
        return afterOpenTagName;
      }
      effects.consume(code);
      return inQuotedAttr;
    }

    function unquotedAttrValue(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code) || isInlineSpace(code) || code === codes.greaterThan) {
        return afterOpenTagName(code);
      }
      if (isUnquotedValueDisallowed(code)) return nok(code);

      // Everything else (including `/`, `{`, `}`, `:`, `.`) is a value char.
      effects.consume(code);
      return unquotedAttrValue;
    }

    function selfCloseGt(code: Code): State | undefined {
      if (code === codes.greaterThan) {
        effects.consume(code);
        return afterClose;
      }
      // `/` without `>` — not self-closing; hand back to the attribute loop.
      return afterOpenTagName(code);
    }

    // ── Multi-line opening tag continuation (flow only) ───────────────────

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
      if (code === null || markdownLineEnding(code)) return openTagContinuationStart(code);
      effects.enter('htmlLowercaseData');
      if (quoteChar !== null) return inQuotedAttr(code);
      return afterOpenTagName(code);
    }

    // ── Body ──────────────────────────────────────────────────────────────

    function body(code: Code): State | undefined {
      if (code === null) return nok(code);
      if (markdownLineEnding(code)) {
        if (!isFlow) return nok(code);
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

    function bodyLessThan(code: Code): State | undefined {
      if (code === codes.slash) {
        effects.consume(code);
        closingTagName = '';
        return closingTagNameFirst;
      }
      // Potential nested opening tag of the same name (depth counting)
      if (isLower(code)) {
        closingTagName = String.fromCharCode(code);
        effects.consume(code);
        return nestedOpenTagName;
      }
      return body(code);
    }

    function nestedOpenTagName(code: Code): State | undefined {
      if (isTagNameChar(code)) {
        closingTagName += String.fromCharCode(code);
        effects.consume(code);
        return nestedOpenTagName;
      }
      if (
        closingTagName === tagName &&
        !VOID_ELEMENTS.has(closingTagName) &&
        (code === codes.greaterThan || code === codes.slash || isInlineSpace(code))
      ) {
        depth += 1;
      }
      return body(code);
    }

    function closingTagNameFirst(code: Code): State | undefined {
      if (isLower(code)) {
        closingTagName = String.fromCharCode(code);
        effects.consume(code);
        return closingTagNameRest;
      }
      return body(code);
    }

    function closingTagNameRest(code: Code): State | undefined {
      if (isTagNameChar(code)) {
        closingTagName += String.fromCharCode(code);
        effects.consume(code);
        return closingTagNameRest;
      }
      if (closingTagName === tagName && code === codes.greaterThan) {
        depth -= 1;
        effects.consume(code);
        return depth === 0 ? afterClose : body;
      }
      return body(code);
    }

    // ── After closing tag / self-close ────────────────────────────────────

    function afterClose(code: Code): State | undefined {
      if (!isFlow) {
        // Inline: exit immediately, leave trailing chars to the paragraph.
        effects.exit('htmlLowercaseData');
        effects.exit('htmlLowercase');
        return ok(code);
      }
      if (code === null || markdownLineEnding(code)) {
        effects.exit('htmlLowercaseData');
        effects.exit('htmlLowercase');
        return ok(code);
      }
      // Only trailing whitespace is allowed on the close-tag line. Non-
      // whitespace after `</tag>` means this is inline HTML inside a
      // paragraph — bail so the paragraph + inline path handles it.
      if (isInlineSpace(code)) {
        effects.consume(code);
        return afterClose;
      }
      return nok(code);
    }

    // ── Body continuation (flow only) ─────────────────────────────────────

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
      if (code === null || markdownLineEnding(code)) return bodyContinuationStart(code);
      effects.enter('htmlLowercaseData');
      return body(code);
    }

    function continuationAfter(code: Code): State | undefined {
      if (code === null) return nok(code);
      effects.exit('htmlLowercase');
      return ok(code);
    }
  };
}

// ── Constructs ───────────────────────────────────────────────────────────

const htmlLowercaseConstruct: Construct = {
  name: 'htmlLowercase',
  tokenize: createTokenize('flow'),
  resolveTo: resolveToHtmlLowercase,
  concrete: true,
};

const htmlLowercaseTextConstruct: Construct = {
  name: 'htmlLowercaseText',
  tokenize: createTokenize('text'),
};

/**
 * Micromark extension that tokenizes lowercase HTML tags, tolerating unquoted
 * attribute values with characters that micromark-core-commonmark's html-flow
 * / html-text reject (notably `/`).
 *
 * Emits an `html` mdast node containing the raw tag source — rehype-raw then
 * parses it via parse5, which is spec-compliant for HTML5.
 *
 * Registered for both flow (block) and text (inline) contexts. Bails (`nok`)
 * on tags that already have working CommonMark semantics (type-6 block tags
 * like `<div>`, `<figure>`; rawtext tags like `<script>`, `<pre>`). Void
 * elements (`<br>`, `<img>`, `<hr>`, etc.) are recognized as self-
 * terminating without requiring a matching close tag.
 */
export function htmlLowercase(): Extension {
  return {
    flow: { [codes.lessThan]: [htmlLowercaseConstruct] },
    text: { [codes.lessThan]: [htmlLowercaseTextConstruct] },
  };
}
