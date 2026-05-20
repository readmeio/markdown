/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

import { GENERIC_MDX_COMPONENT_EXCLUDED_TAGS } from '../../constants';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    mdxComponent: 'mdxComponent';
    mdxComponentData: 'mdxComponentData';
  }
}

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

const mdxComponentFlowConstruct: Construct = {
  name: 'mdxComponent',
  tokenize: createTokenize('flow'),
  resolveTo: resolveToMdxComponent,
  concrete: true,
};

const mdxComponentTextConstruct: Construct = {
  name: 'mdxComponentText',
  tokenize: createTokenize('text'),
};

/**
 * Factory for both flow (block) and text (inline) variants.
 *
 * **Flow** — the original behavior: claims PascalCase components (always) and
 * lowercase HTML tags that carry at least one `{…}` attribute expression.
 * Multi-line, concrete, `afterClose` consumes the rest of the line.
 *
 * **Text** — runs inside paragraphs / inline context. Claims *only* lowercase
 * tags with brace attributes (PascalCase is intentionally flow-only, matching
 * how ReadMe's custom components are authored). Aborts on line endings (inline
 * constructs don't span lines) and exits immediately after `</tag>` so the
 * paragraph's inline parser picks up the trailing text.
 */
function createTokenize(mode: 'flow' | 'text') {
  const isFlow = mode === 'flow';

  return function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let tagName = '';
    let depth = 0;
    let closingTagName = '';
    // For lowercase tags we only want to claim the block if it uses JSX
    // attribute expression syntax (`attr={...}`). Plain HTML should fall
    // through to CommonMark html-flow. Uppercase tags are always claimed
    // (flow only — PascalCase is not accepted in text mode).
    let isLowercaseTag = false;
    let sawBraceAttr = false;

    // Code span tracking
    let codeSpanOpenSize = 0;
    let codeSpanCloseSize = 0;

    // Fenced code block tracking
    let fenceChar: Code = null;
    let fenceLength = 0;
    let fenceCloseLength = 0;
    let atLineStart = false;

    // Bail when the opener line has unmatched tag-like tokens in its body.
    // `<Foo>_<Bar>.csv` leaves opens > closes; matched shapes like
    // `<Callout>x <strong>y</strong>` balance to 0. Without this,
    // `concrete: true` causes orphan openers to eat sibling blockquotes.
    let onOpenerLine = false;
    let openerLineHasContent = false;
    let openerLineOpens = 0;
    let openerLineCloses = 0;

    // Attribute parsing state
    let quoteChar: Code = null;
    let braceDepth = 0;
    let inTemplateLit = false; // true when inside a template literal (for line continuation)
    // Stack of braceDepth values at each ${...} interpolation entry point.
    // When a } brings braceDepth back to a saved value, we return to the
    // template literal instead of continuing in the brace expression.
    const templateStack: number[] = [];

    const isAlpha = (code: number) =>
      (code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
      (code >= codes.lowercaseA && code <= codes.lowercaseZ);

    const isSameCaseAsTag = (code: number) =>
      isLowercaseTag
        ? code >= codes.lowercaseA && code <= codes.lowercaseZ
        : code >= codes.uppercaseA && code <= codes.uppercaseZ;

    // Shared brace-expression state machine. The two call sites differ only in where
    // to continue after a line ending and where to return when braceDepth reaches zero.
    function createBraceExprStates(continuationStart: State, afterBraceClose: State) {
      function braceExpr(code: Code): State | undefined {
        if (code === null) return nok(code);

        if (markdownLineEnding(code)) {
          if (!isFlow) return nok(code);
          effects.exit('mdxComponentData');
          return continuationStart(code);
        }

        if (code === codes.quotationMark || code === codes.apostrophe) {
          quoteChar = code;
          effects.consume(code);
          return braceString;
        }

        if (code === codes.graveAccent) {
          inTemplateLit = true;
          effects.consume(code);
          return braceTemplateLiteral;
        }

        if (code === codes.leftCurlyBrace) {
          braceDepth += 1;
          effects.consume(code);
          return braceExpr;
        }

        if (code === codes.rightCurlyBrace) {
          braceDepth -= 1;
          effects.consume(code);

          if (templateStack.length > 0 && braceDepth === templateStack[templateStack.length - 1]) {
            templateStack.pop();
            inTemplateLit = true;
            return braceTemplateLiteral;
          }

          if (braceDepth === 0) {
            return afterBraceClose;
          }
          return braceExpr;
        }

        effects.consume(code);
        return braceExpr;
      }

      function braceString(code: Code): State | undefined {
        if (code === null) return nok(code);

        if (markdownLineEnding(code)) {
          if (!isFlow) return nok(code);
          effects.exit('mdxComponentData');
          return continuationStart(code);
        }

        if (code === codes.backslash) {
          effects.consume(code);
          return braceStringEscape;
        }

        if (code === quoteChar) {
          effects.consume(code);
          quoteChar = null;
          return braceExpr;
        }

        effects.consume(code);
        return braceString;
      }

      function braceStringEscape(code: Code): State | undefined {
        if (code === null || markdownLineEnding(code)) {
          return braceString(code);
        }
        effects.consume(code);
        return braceString;
      }

      function braceTemplateLiteral(code: Code): State | undefined {
        if (code === null) return nok(code);

        if (markdownLineEnding(code)) {
          if (!isFlow) return nok(code);
          effects.exit('mdxComponentData');
          return continuationStart(code);
        }

        if (code === codes.graveAccent) {
          inTemplateLit = false;
          effects.consume(code);
          return braceExpr;
        }

        if (code === codes.backslash) {
          effects.consume(code);
          return braceTemplateLiteralEscape;
        }

        if (code === codes.dollarSign) {
          effects.consume(code);
          return braceTemplateLiteralDollar;
        }

        effects.consume(code);
        return braceTemplateLiteral;
      }

      function braceTemplateLiteralEscape(code: Code): State | undefined {
        if (code === null || markdownLineEnding(code)) {
          return braceTemplateLiteral(code);
        }
        effects.consume(code);
        return braceTemplateLiteral;
      }

      function braceTemplateLiteralDollar(code: Code): State | undefined {
        if (code === codes.leftCurlyBrace) {
          templateStack.push(braceDepth);
          braceDepth += 1;
          inTemplateLit = false;
          effects.consume(code);
          return braceExpr;
        }
        return braceTemplateLiteral(code);
      }

      return { braceExpr, braceString, braceTemplateLiteral };
    }

    const {
      braceExpr: inBraceExpr,
      braceString: inBraceString,
      braceTemplateLiteral: inBraceTemplateLiteral,
    } = createBraceExprStates(openTagContinuationStart, afterOpenTagName);

    const {
      braceExpr: inBodyBraceExpr,
      braceString: inBodyBraceString,
      braceTemplateLiteral: inBodyBraceTemplateLiteral,
    } = createBraceExprStates(bodyContinuationStart, body);

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
      // Uppercase A-Z → PascalCase MDX component. Flow-only — PascalCase
      // components are block elements in ReadMe's authoring model.
      if (code !== null && code >= codes.uppercaseA && code <= codes.uppercaseZ) {
        if (!isFlow) return nok(code);
        tagName = String.fromCharCode(code);
        isLowercaseTag = false;
        effects.consume(code);
        return tagNameRest;
      }
      // Lowercase a-z → HTML tag (claim only if `{...}` attr appears). In
      // flow mode, refuse to interrupt a paragraph — same rule as html-flow
      // type-7. The text variant picks these up during inline parsing.
      if (code !== null && code >= codes.lowercaseA && code <= codes.lowercaseZ) {
        if (isFlow && self.interrupt) return nok(code);
        tagName = String.fromCharCode(code);
        isLowercaseTag = true;
        sawBraceAttr = false;
        effects.consume(code);
        return tagNameRest;
      }
      return nok(code);
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
      if (GENERIC_MDX_COMPONENT_EXCLUDED_TAGS.has(tagName)) {
        return nok(code);
      }

      depth = 1;
      return afterOpenTagName(code);
    }

    // ── Opening tag attributes ─────────────────────────────────────────────

    function afterOpenTagName(code: Code): State | undefined {
      if (code === null) return nok(code);

      if (markdownLineEnding(code)) {
        if (!isFlow) return nok(code);
        effects.exit('mdxComponentData');
        return openTagContinuationStart(code);
      }

      // Self-closing />
      if (code === codes.slash) {
        if (isLowercaseTag && !sawBraceAttr) return nok(code);
        effects.consume(code);
        return selfCloseGt;
      }

      // End of opening tag
      if (code === codes.greaterThan) {
        if (isLowercaseTag && !sawBraceAttr) return nok(code);
        effects.consume(code);
        onOpenerLine = isFlow;
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
        sawBraceAttr = true;
        effects.consume(code);
        return inBraceExpr;
      }

      effects.consume(code);
      return afterOpenTagName;
    }

    function inQuotedAttr(code: Code): State | undefined {
      if (code === null) return nok(code);

      if (markdownLineEnding(code)) {
        if (!isFlow) return nok(code);
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
        if (!isFlow) return nok(code);
        // See `onOpenerLine` declaration. Bail iff the opener line had
        // content AND more opener-shaped tokens than closer-shaped tokens.
        if (onOpenerLine && openerLineHasContent && openerLineOpens > openerLineCloses) {
          return nok(code);
        }
        onOpenerLine = false;
        effects.exit('mdxComponentData');
        atLineStart = true;
        return bodyContinuationStart(code);
      }

      if (code !== codes.space && code !== codes.horizontalTab) {
        openerLineHasContent = true;
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

      // JSX expression child — track braces/template literals so the closing
      // backtick of `{`...`}` is not misread as a code span opener
      if (code === codes.leftCurlyBrace) {
        braceDepth = 1;
        inTemplateLit = false;
        effects.consume(code);
        atLineStart = false;
        return inBodyBraceExpr;
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
        if (onOpenerLine) openerLineCloses += 1;
        effects.consume(code);
        closingTagName = '';
        return closingTagNameFirst;
      }

      // Potential nested opening tag (same case class as the outer tag)
      if (code !== null && isAlpha(code) && isSameCaseAsTag(code)) {
        if (onOpenerLine) openerLineOpens += 1;
        closingTagName = String.fromCharCode(code);
        effects.consume(code);
        return nestedOpenTagName;
      }

      // Tag-like token but not in nested-tracking case (different case).
      // Count it for the opener-line bail heuristic anyway: `<strong>` in
      // `<Callout>x <strong>y</strong></Callout>` should pair with `</strong>`.
      if (code !== null && isAlpha(code) && onOpenerLine) {
        openerLineOpens += 1;
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
      if (code !== null && isAlpha(code) && isSameCaseAsTag(code)) {
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
      // Text (inline): exit immediately so the paragraph's inline parser
      // picks up the trailing chars after `</tag>`.
      if (!isFlow) {
        effects.exit('mdxComponentData');
        effects.exit('mdxComponent');
        return ok(code);
      }
      if (code === null || markdownLineEnding(code)) {
        effects.exit('mdxComponentData');
        effects.exit('mdxComponent');
        return ok(code);
      }
      // Flow: trailing chars on the line are captured into the token so the
      // component transformer can reparse them as siblings after the block.
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

      // Resume inside a body brace expression if a line ending interrupted one
      if (braceDepth > 0) {
        if (inTemplateLit) return inBodyBraceTemplateLiteral(code);
        if (quoteChar !== null) return inBodyBraceString(code);
        return inBodyBraceExpr(code);
      }

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
  };
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
 * Micromark extension that tokenizes MDX-like components.
 *
 * **Flow (block)** — captures 1) PascalCase components and 2) lowercase HTML tags
 * that carry `{…}` attribute expressions as single flow blocks (including
 * self-closing `<Component />`). Prevents CommonMark from fragmenting them
 * across multiple HTML / paragraph nodes.
 *
 * **Text (inline)** — registers only for lowercase tags with brace attrs
 * (e.g. `Start <a href={url}>here</a> end`). Picks them up during inline
 * parsing so they render inline inside their paragraph, then are rewritten
 * to `mdxJsxTextElement` by the `components/inline-html` transformer.
 * PascalCase is intentionally flow-only; ReadMe's custom components are
 * authored as block-level elements.
 *
 * Excludes tags handled by dedicated tokenizers: Table, HTMLBlock, Glossary,
 * Anchor.
 *
 * The resulting `html` mdast node is later restructured into an
 * `mdxJsxFlowElement` (block) or `mdxJsxTextElement` (inline) by the
 * corresponding component-block transformer.
 */
export function mdxComponent(): Extension {
  return {
    flow: { [codes.lessThan]: [mdxComponentFlowConstruct] },
    text: { [codes.lessThan]: [mdxComponentTextConstruct] },
  };
}
