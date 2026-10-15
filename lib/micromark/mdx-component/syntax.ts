/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, Resolver, State, TokenizeContext } from 'micromark-util-types';

import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { htmlBlockNames, htmlRawNames } from 'micromark-util-html-tag-name';
import { codes, types } from 'micromark-util-symbol';

import { FOREIGN_CONTENT_TAGS, HTML_TABLE_STRUCTURE_TAGS, HTML_VOID_ELEMENTS } from '../../../utils/common-html-words';
import { INLINE_COMPONENT_TAGS, TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS } from '../../constants';
import { createOpaqueRegions } from '../util/opaque-regions';

import { markupOnlyContinuation } from './continuation-checks';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    mdxComponent: 'mdxComponent';
    mdxComponentData: 'mdxComponentData';
  }
}

// Raw tags (type-1: pre/script/style/textarea) and block tags (type-6: div,
// section, …) always start a block, so they stay flow even with trailing
// content. Other lowercase tags (i, span, …) follow the type-7 rule and only
// stay flow when nothing trails the close tag.
const htmlFlowTagNames = new Set([...htmlRawNames, ...htmlBlockNames]);

// Lowercase type-6 block tags claimable in flow even without a `{…}` attribute, so
// blank lines between nested JSX siblings don't fragment the block. Excludes table
// tags (mdxishTables owns their blank lines) and voids (never close).
const plainBlockClaimTagNames = new Set(
  [...htmlBlockNames].filter(tag => !HTML_TABLE_STRUCTURE_TAGS.has(tag) && !HTML_VOID_ELEMENTS.has(tag)),
);

const foreignContentTags = new Set<string>(FOREIGN_CONTENT_TAGS);

// Type-7 lowercase tags (a, span, button, unknown names): CommonMark ends their block
// at a blank line, so the wrapper's children don't re-nest into one element. Only
// claimable in block-wrapper shape (see `blockWrapperOpenerRest`), and never for voids
// or raw/foreign-content bodies, which have dedicated owners.
const isBlockWrapperClaimTagName = (tag: string): boolean =>
  !htmlFlowTagNames.has(tag) && !HTML_VOID_ELEMENTS.has(tag) && !foreignContentTags.has(tag);

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
 * **Text** — runs inside paragraphs / inline context. Claims lowercase tags and
 * inline PascalCase components (`INLINE_COMPONENT_TAGS` — Anchor, Glossary), both
 * gated on at least one `{…}` brace attribute. All other PascalCase stays
 * flow-only, matching how ReadMe's custom components are authored. Aborts on line
 * endings (inline constructs don't span lines) and exits immediately after
 * `</tag>` so the paragraph's inline parser picks up the trailing text.
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
    // through to CommonMark html-flow. Flow mode claims any PascalCase block
    // component; text mode claims only inline PascalCase components
    // (INLINE_COMPONENT_TAGS — Anchor, Glossary), also brace-gated.
    let isLowercaseTag = false;
    let sawBraceAttr = false;

    // A plain lowercase block tag claimed without a `{…}` attribute, gated by
    // `plainClaimLineStart`: after a blank line it may only continue on a tag line.
    let isPlainBlockClaim = false;
    let pendingBlankLine = false;
    // Type-7 tag claimed pending the block-wrapper (opener alone on its line) check.
    let pendingBlockWrapperClaim = false;

    let atLineStart = false;

    // True once this construct consumes any line ending; lets `afterClose`
    // treat only single-line lowercase tags as inline candidates.
    let sawLineEnding = false;

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

    const isAlpha = (code: number) =>
      (code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
      (code >= codes.lowercaseA && code <= codes.lowercaseZ);

    const isSameCaseAsTag = (code: number) =>
      isLowercaseTag
        ? code >= codes.lowercaseA && code <= codes.lowercaseZ
        : code >= codes.uppercaseA && code <= codes.uppercaseZ;

    let regionResume: State = nok;
    const regions = createOpaqueRegions({ effects, nok, consume: effects.consume, lineEnding: regionLineEnding });

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
      // Uppercase A-Z → PascalCase MDX component. Flow mode claims block
      // components; text mode only claims inline components (Anchor, Glossary),
      // which is enforced once the full name is known in `tagNameRest`.
      if (code !== null && code >= codes.uppercaseA && code <= codes.uppercaseZ) {
        tagName = String.fromCharCode(code);
        isLowercaseTag = false;
        sawBraceAttr = false;
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

      // Tag name complete — decide whether this tokenizer claims the tag.
      // Three cases: lowercase tags are always candidates (brace-gated later in
      // `afterOpenTagName`); flow-mode PascalCase claims any block component
      // except those with a dedicated tokenizer; text-mode PascalCase claims
      // only inline components (Anchor, Glossary).
      const claimable = isLowercaseTag
        ? true
        : isFlow
          ? !TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS.has(tagName)
          : INLINE_COMPONENT_TAGS.has(tagName);
      if (!claimable) return nok(code);

      depth = 1;
      return afterOpenTagName(code);
    }

    // ── Opening tag attributes ─────────────────────────────────────────────

    function afterOpenTagName(code: Code): State | undefined {
      if (code === null) return nok(code);

      // Everything except a flow-mode PascalCase block component must carry a
      // `{…}` brace attribute to be claimed; plain HTML falls through to
      // CommonMark.
      const requiresBraceAttr = isLowercaseTag || !isFlow;

      if (markdownLineEnding(code)) {
        if (!isFlow) return nok(code);
        effects.exit('mdxComponentData');
        return openTagContinuationStart(code);
      }

      // Self-closing />
      if (code === codes.slash) {
        if (requiresBraceAttr && !sawBraceAttr) return nok(code);
        effects.consume(code);
        return selfCloseGt;
      }

      // End of opening tag
      if (code === codes.greaterThan) {
        if (requiresBraceAttr && !sawBraceAttr && !claimBraceLessTag()) return nok(code);
        effects.consume(code);
        onOpenerLine = isFlow;
        return pendingBlockWrapperClaim ? blockWrapperOpenerRest : body;
      }

      // Quoted attribute value
      if (code === codes.quotationMark || code === codes.apostrophe) {
        quoteChar = code;
        effects.consume(code);
        return inQuotedAttr;
      }

      // JSX expression attribute
      if (code === codes.leftCurlyBrace) {
        sawBraceAttr = true;
        return regions.braceExpression(code, afterOpenTagName);
      }

      // A raw `<` can't sit in an opening tag (quotes/braces are handled above);
      // bailing bounds each attempt to the next `<` instead of rescanning the line.
      if (code === codes.lessThan) return nok(code);

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

    // Whether a brace-less lowercase flow tag is claimable: type-6 tags immediately,
    // type-7 tags pending the block-wrapper check; anything else is CommonMark's.
    function claimBraceLessTag(): boolean {
      if (!isFlow) return false;
      if (plainBlockClaimTagNames.has(tagName)) {
        isPlainBlockClaim = true;
        return true;
      }
      if (isBlockWrapperClaimTagName(tagName)) {
        pendingBlockWrapperClaim = true;
        return true;
      }
      return false;
    }

    // A type-7 tag is claimed only as a block wrapper: opener alone on its line
    // (trailing spaces ok). Inline content after the opener bails to CommonMark.
    function blockWrapperOpenerRest(code: Code): State | undefined {
      if (markdownSpace(code)) {
        effects.consume(code);
        return blockWrapperOpenerRest;
      }
      if (!markdownLineEnding(code)) return nok(code);
      pendingBlockWrapperClaim = false;
      isPlainBlockClaim = true;
      return body(code);
    }

    // Continuation for multi-line opening tags
    function openTagContinuationStart(code: Code): State | undefined {
      return continueOnNextLine(code, openTagContinuationBefore);
    }

    function openTagContinuationBefore(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        return openTagContinuationStart(code);
      }
      effects.enter('mdxComponentData');

      // Resume the correct state after a line ending in the opening tag.
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

      if (code === codes.graveAccent) {
        const mayFence = atLineStart;
        atLineStart = false;
        return regions.backticks(code, body, mayFence);
      }

      // JSX expression child — track braces/template literals so the closing
      // backtick of `{`...`}` is not misread as a code span opener
      if (code === codes.leftCurlyBrace) {
        atLineStart = false;
        return regions.braceExpression(code, body);
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

    // ── Tag detection inside body ──────────────────────────────────────────

    function bodyLessThan(code: Code): State | undefined {
      // A second `<` means legacy variable syntax (`<<var>>`), not a tag: the name that
      // follows belongs to the variable. Counting it as a nested opener would leave the
      // body unbalanced and lose the claim on this block.
      if (code === codes.lessThan) {
        effects.consume(code);
        atLineStart = false;
        return bodyAngleRun;
      }

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

    function bodyAngleRun(code: Code): State | undefined {
      if (code === codes.lessThan) {
        effects.consume(code);
        return bodyAngleRun;
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

      // Same-name opener followed by a tag-end char bumps depth. A line ending
      // counts too: Prettier puts a newline right after the name (`<div\n …\n>`).
      if (
        closingTagName === tagName &&
        (code === codes.greaterThan ||
          code === codes.slash ||
          code === codes.space ||
          code === codes.horizontalTab ||
          markdownLineEnding(code))
      ) {
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
      // A single-line type-7 lowercase tag with content trailing its close is
      // inline, so `<i …></i> <a>…</a>` stays on one line instead of splitting
      // into separate blocks. Raw/block tags (pre, div, …) stay flow.
      if (isLowercaseTag && !sawLineEnding && !htmlFlowTagNames.has(tagName)) {
        return afterCloseInlineCandidate(code);
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

    // Whitespace-only to the line ending keeps the flow block; any other
    // trailing char means inline content, so refuse and let inline parsing run.
    function afterCloseInlineCandidate(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        effects.exit('mdxComponentData');
        effects.exit('mdxComponent');
        return ok(code);
      }
      if (markdownSpace(code)) {
        effects.consume(code);
        return afterCloseInlineCandidate;
      }
      return nok(code);
    }

    // ── Body continuation (line endings) ───────────────────────────────────

    function bodyContinuationStart(code: Code): State | undefined {
      return continueOnNextLine(code, bodyContinuationBefore);
    }

    function bodyContinuationBefore(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        // Empty line: outside any `{…}` expression this is CommonMark's html-block
        // terminator, so a plain block claim must pass the guard below to continue.
        if (isPlainBlockClaim) pendingBlankLine = true;
        return bodyContinuationStart(code);
      }
      effects.enter('mdxComponentData');
      if (isPlainBlockClaim) return plainClaimLineStart(code);
      return bodyLineStart(code);
    }

    // Dispatch a non-blank continuation line: fenced code at line start, else body.
    function bodyLineStart(code: Code): State | undefined {
      // Skip leading indentation while staying "at line start" so an indented
      // fence is still recognized. Otherwise the first space clears `atLineStart`
      // and its content — including any unbalanced `{` — stays live text (CX-3704).
      if (atLineStart && markdownSpace(code)) {
        effects.consume(code);
        return bodyLineStart;
      }
      if (atLineStart && code === codes.tilde) {
        atLineStart = false;
        return regions.tildes(code, body);
      }
      if (atLineStart && code === codes.graveAccent) {
        atLineStart = false;
        return regions.backticks(code, body, true);
      }
      atLineStart = false;
      return body(code);
    }

    // Line-start gate for plain block claims. After a blank line the block may only
    // continue on a markup-only tag line (`<…`); anything else refuses, so CommonMark
    // reparses it as markdown and rehype-raw re-nests it into the wrapper.
    function plainClaimLineStart(code: Code): State | undefined {
      // Leading whitespace only → treat as a blank line, matching CommonMark.
      if (markdownSpace(code)) {
        effects.consume(code);
        return plainClaimLineStart;
      }
      if (code === null || markdownLineEnding(code)) {
        pendingBlankLine = true;
        effects.exit('mdxComponentData');
        return bodyContinuationStart(code);
      }
      if (pendingBlankLine) {
        if (code !== codes.lessThan) return nok(code);
        return effects.check(markupOnlyContinuation, plainClaimContinue, nok)(code);
      }
      return bodyLineStart(code);
    }

    function plainClaimContinue(code: Code): State | undefined {
      pendingBlankLine = false;
      return bodyLineStart(code);
    }

    // ── Opaque regions: code spans, fences, `{…}` ──────────────────────────

    // Inline tags stay on one line. In flow a region runs on, blank lines included.
    function regionLineEnding(code: Code, resume: State): State | undefined {
      if (!isFlow) return nok(code);
      regionResume = resume;
      effects.exit('mdxComponentData');
      return continueOnNextLine(code, regionContinuationBefore);
    }

    function regionContinuationBefore(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return continueOnNextLine(code, regionContinuationBefore);
      effects.enter('mdxComponentData');
      return regionResume(code);
    }

    // ── Shared line-ending continuation ────────────────────────────────────

    // Consumes one line ending and resumes at `nextLine`. Lazy lines (under-indented
    // under a list item or blockquote) continue too: a claim only ends at its closing
    // tag, and an unclosed one fails whole at EOF instead of leaving a truncated opener (CX-3940).
    function continueOnNextLine(code: Code, nextLine: State): State | undefined {
      if (!markdownLineEnding(code)) return nok(code);
      sawLineEnding = true;
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      return nextLine;
    }
  };
}

/**
 * Micromark extension that tokenizes MDX-like components.
 *
 * **Flow (block)** — captures 1) PascalCase components and 2) lowercase HTML tags
 * that carry `{…}` attribute expressions as single flow blocks (including
 * self-closing `<Component />`). Prevents CommonMark from fragmenting them
 * across multiple HTML / paragraph nodes.
 *
 * **Text (inline)** — registers for lowercase tags and inline PascalCase
 * components (Anchor, Glossary) that carry brace attrs (e.g.
 * `Start <a href={url}>here</a> end`, `<Anchor href={url}>x</Anchor>`). Picks
 * them up during inline parsing so they render inline inside their paragraph,
 * then are rewritten to `mdxJsxTextElement` by the `components/inline-html`
 * transformer. All other PascalCase is flow-only; ReadMe's custom components
 * are authored as block-level elements.
 *
 * Excludes Table, Glossary and Anchor (`TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS`).
 * `HTMLBlock` is deliberately *not* excluded — this claims it into the same
 * opaque `html` node `htmlBlockComponent` would, and the transforms skip it by
 * name via `GENERIC_MDX_COMPONENT_EXCLUDED_TAGS`.
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
